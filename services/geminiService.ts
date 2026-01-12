import { GoogleGenAI, Type } from "@google/genai";
import { ResearchConfig, ResearchLog, Source, Settings } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class DeepResearchService {
  private googleAI: GoogleGenAI | null = null;
  private settings: Settings | null = null;
  private cancelFlag: boolean = false;
  private searchCount: number = 0; // Track local search count

  constructor() {}

  private initAI(settings: Settings) {
    this.settings = settings;
    if (!settings.apiKey) {
      throw new Error("请先在设置中配置 API Key");
    }

    if (settings.provider === 'google') {
      this.googleAI = new GoogleGenAI({ 
        apiKey: settings.apiKey,
      }, {
        // @ts-ignore
        baseUrl: settings.baseUrl || undefined 
      });
    } else {
      this.googleAI = null;
    }
  }

  cancel() {
    this.cancelFlag = true;
  }

  private checkCancelled() {
    if (this.cancelFlag) throw new Error("用户取消了研究。");
  }

  private async generateText(prompt: string, model: string, systemInstruction?: string, jsonMode?: boolean): Promise<{ text: string, usage?: number }> {
    if (!this.settings) throw new Error("设置未初始化");

    // --- Google Provider ---
    if (this.settings.provider === 'google') {
      if (!this.googleAI) throw new Error("Google AI 客户端初始化失败");
      const config: any = {};
      if (jsonMode) {
         config.responseMimeType = 'application/json';
      }
      if (systemInstruction) {
         config.systemInstruction = systemInstruction;
      }
      
      const response = await this.googleAI.models.generateContent({
        model: model,
        contents: prompt,
        config: config
      });
      
      const usage = response.usageMetadata?.totalTokenCount || 0;
      return { text: response.text || "", usage };
    } 
    
    // --- OpenAI Compatible Provider ---
    else {
      const baseUrl = this.settings.baseUrl || "https://api.openai.com/v1";
      const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
      
      const messages = [];
      if (systemInstruction) {
        messages.push({ role: "system", content: systemInstruction });
      }
      messages.push({ role: "user", content: prompt });

      const body: any = {
        model: model,
        messages: messages,
        temperature: 0.7
      };
      
      if (jsonMode) {
        body.response_format = { type: "json_object" };
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.settings.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`OpenAI 接口错误 (${response.status}): ${err}`);
      }

      const data = await response.json();
      return { 
          text: data.choices?.[0]?.message?.content || "",
          usage: data.usage?.total_tokens || 0
      };
    }
  }

  /**
   * Tavily Search API
   */
  private async searchTavily(query: string, apiKey: string): Promise<{ summary: string; sources: Source[] }> {
    this.searchCount++;
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: query,
          search_depth: "basic",
          include_answer: true,
          max_results: 5
        })
      });

      if (!response.ok) {
        console.warn("Tavily Search failed", await response.text());
        return { summary: "", sources: [] };
      }

      const data = await response.json();
      const summary = data.answer || data.results?.map((r: any) => r.content).join('\n\n') || "";
      const sources = data.results?.map((r: any) => ({
        title: r.title,
        uri: r.url
      })) || [];

      return { summary, sources };
    } catch (e) {
      console.error("Tavily error", e);
      return { summary: "", sources: [] };
    }
  }

  /**
   * Performs Search
   */
  private async search(query: string, model: string): Promise<{ summary: string; sources: Source[] }> {
    if (!this.settings) throw new Error("设置未初始化");

    // 1. Tavily Search
    if (this.settings.provider !== 'google' && this.settings.tavilyApiKey) {
       return this.searchTavily(query, this.settings.tavilyApiKey);
    }

    // 2. Google Provider with Native Search
    if (this.settings.provider === 'google' && this.googleAI) {
      try {
        const response = await this.googleAI.models.generateContent({
          model: model,
          contents: `研究任务: "${query}". 提取精确的事实、数据和日期。请用中文总结发现。`,
          config: { tools: [{ googleSearch: {} }] }
        });

        const rawSources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources = rawSources
          .filter((c: any) => c.web?.uri && c.web?.title)
          .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));

        return { summary: response.text || "", sources };
      } catch (e) {
        return { summary: "", sources: [] };
      }
    } 
    
    // 3. Fallback / No Search Tool
    else {
      const prompt = `
        你是一个拥有即时互联网知识的搜索引擎。
        请针对以下查询提供详细的、基于事实的摘要，包含数据、日期和关键实体。
        查询: "${query}"
        
        文末请列出模拟的权威来源。
      `;
      try {
         const { text } = await this.generateText(prompt, model, "You are a helpful research assistant.");
         return { 
             summary: text, 
             sources: [{ title: "AI 内部知识库 (OpenAI/Fallback)", uri: "#ai-internal" }] 
         };
      } catch (e) {
          return { summary: "", sources: [] };
      }
    }
  }

  // --- Step 1: Generate Plan ---
  async generateResearchPlan(config: ResearchConfig, settings: Settings): Promise<{ title: string; chapters: string[], usage: number }> {
    this.cancelFlag = false;
    this.initAI(settings);
    const model = settings.model || (settings.provider === 'google' ? 'gemini-3-pro-preview' : 'gpt-4o');
    const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    const currentYear = new Date().getFullYear();
    
    // Slightly increased chapter count for "Deep" default
    const chapterCount = config.depth === 1 ? 4 : config.depth === 2 ? 6 : 10;
    
    const systemPrompt = `你是一位专业的学术研究导师。当前时间是 ${currentDate}。请以JSON格式输出。`;
    const userPrompt = `
      主题: "${config.query}"
      目标: 为一份深度研究报告创建一个详细的目录（目标大约 ${chapterCount} 个主要章节）。
      
      要求:
      1. 标题必须具有学术性且描述性强，必须使用中文。
      2. 章节必须涵盖历史背景、技术机制、市场分析、挑战和未来展望等。
      3. **严禁包含“伦理考量”、“道德风险”或类似的章节**。请专注于技术、科学、经济或历史层面的深度。
      4. 逻辑流畅，层层递进。
      5. 输出必须完全使用简体中文。
      6. **时效性**: 这是一个 ${currentYear} 年的研究。请确保章节设计能引导AI去挖掘 ${currentYear} 或 ${currentYear-1} 年的最新数据，而不是陈旧的历史数据。
      
      返回 JSON: { "title": "报告标题", "chapters": ["1. 绪论", "2. 文献综述...", ...] }
    `;

    try {
      const { text, usage } = await this.generateText(userPrompt, model, systemPrompt, true);
      const cleanText = text.replace(/```json\n|\n```/g, '');
      const json = JSON.parse(cleanText);
      
      if (!json.chapters || !Array.isArray(json.chapters)) {
          return { 
              title: json.title || config.query, 
              chapters: ["研究背景", "核心技术分析", "市场现状", "挑战与机遇", "结论与展望"],
              usage: usage || 0
          };
      }
      return { ...json, usage: usage || 0 };
    } catch (e) {
      console.error("Outline failed", e);
      return { title: config.query, chapters: ["研究背景", "核心分析", "结论"], usage: 0 };
    }
  }

  // --- Step 2: Execute Research ---
  async *executeResearch(
    config: ResearchConfig, 
    settings: Settings, 
    title: string, 
    chapters: string[]
  ): AsyncGenerator<ResearchLog> {
    this.initAI(settings); 
    const model = settings.model || (settings.provider === 'google' ? 'gemini-3-pro-preview' : 'gpt-4o');
    
    const globalSources: Source[] = [];
    const uniqueSourceMap = new Map<string, number>(); // uri -> index (1-based)
    const reportSections: string[] = [];
    const chapterFindingsCache: string[] = [];
    let totalTokens = 0;
    this.searchCount = 0;

    // Yield initial info
    yield {
       id: crypto.randomUUID(),
       timestamp: Date.now(),
       type: 'info',
       message: '大纲已确认，开始深度研究...'
    };

    for (let i = 0; i < chapters.length; i++) {
      this.checkCancelled();
      const chapter = chapters[i];
      
      yield {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'info',
        message: `正在编撰章节 ${i+1}/${chapters.length}: ${chapter}`
      };

      // A. Generate Queries
      const { queries, usage: queryTokens } = await this.generateChapterQueries(config.query, chapter, chapterFindingsCache, model);
      totalTokens += queryTokens;
      
      // B. Search
      const chapterFindings: string[] = [];
      const chapterPromptSources = new Set<string>();
      
      for (const q of queries) {
        this.checkCancelled();
        yield { 
            id: crypto.randomUUID(), 
            timestamp: Date.now(), 
            type: 'search', 
            message: `检索: ${q}`,
            tokenCount: queryTokens
        };
        
        await delay(500); 
        const res = await this.search(q, model);
        const currentQueryIndices: number[] = [];

        // Register sources immediately to bind them to the finding
        if (res.sources && res.sources.length > 0) {
            for (const src of res.sources) {
                let index: number;
                if (uniqueSourceMap.has(src.uri)) {
                    index = uniqueSourceMap.get(src.uri)!;
                } else {
                    globalSources.push(src);
                    index = globalSources.length; // 1-based index
                    uniqueSourceMap.set(src.uri, index);
                }
                currentQueryIndices.push(index);
                chapterPromptSources.add(`[${index}] ${src.title}`);
            }

            yield {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                type: 'info',
                message: `发现源 (${res.sources.length})`,
                details: res.sources.map(s => `🔗 ${s.title} - ${s.uri}`)
            };
        }
        
        if (res.summary) {
            // Bind the specific source IDs to this summary block
            // This prevents LLM from citing generic "[研究材料]"
            const sourceTags = currentQueryIndices.length > 0 
                ? ` (来源ID: ${currentQueryIndices.map(i => `[${i}]`).join(', ')})` 
                : '';
            chapterFindings.push(`资料: "${res.summary}"${sourceTags}`);
        }
      }

      chapterFindingsCache.push(chapterFindings.join('\n').slice(0, 1000)); 

      // D. Write Chapter
      yield { id: crypto.randomUUID(), timestamp: Date.now(), type: 'writing', message: `撰写: ${chapter}` };
      
      const { content: chapterContent, usage: writeTokens } = await this.writeChapter(
          config.query, 
          chapter, 
          chapterFindings, 
          Array.from(chapterPromptSources), // Pass formatted source list with Global IDs
          model
      );
      totalTokens += writeTokens;
      reportSections.push(chapterContent);

      yield {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'info',
        message: `章节 ${i+1} 完成`,
        tokenCount: writeTokens,
        details: { partialSection: chapterContent } 
      };
    }

    // 3. Final Compilation
    const fullReport = `# ${title}\n\n` + reportSections.join('\n\n');
    const wordCount = fullReport.replace(/\s+/g, '').length;

    yield {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'info',
      message: "研究完成，正在生成报告...",
      details: { 
        completedResult: {
          title: title,
          report: fullReport,
          sources: globalSources, // Return strict ordered global list
          totalSearchQueries: this.searchCount,
          totalTokens: totalTokens,
          wordCount: wordCount
        }
      }
    };
  }

  // Helpers
  private async generateChapterQueries(topic: string, chapter: string, prevFindings: string[], model: string): Promise<{ queries: string[], usage: number }> {
    const currentYear = new Date().getFullYear();
    const systemPrompt = "你是一个搜索专家。请返回JSON字符串数组。";
    const prompt = `
      主题: "${topic}"
      章节: "${chapter}"
      当前年份: ${currentYear}
      前文背景: ${prevFindings.slice(-3).join('; ')}
      
      生成 3 个具体、高价值的搜索查询。
      **重要**: 优先查询 ${currentYear} 年或 ${currentYear-1} 年的最新数据、报告和统计。
      
      返回 JSON 数组: ["查询1", "查询2", "查询3"]
    `;
    try {
      const { text, usage } = await this.generateText(prompt, model, systemPrompt, true);
      const cleanText = text.replace(/```json\n|\n```/g, '');
      return { queries: JSON.parse(cleanText), usage: usage || 0 };
    } catch {
      return { queries: [`${topic} ${chapter} ${currentYear} 数据`, `${topic} 现状`], usage: 0 };
    }
  }

  private async writeChapter(
    topic: string, 
    chapterTitle: string, 
    findings: string[], 
    promptSources: string[], // e.g., ["[1] Source A", "[5] Source B"]
    model: string
  ): Promise<{ content: string, usage: number }> {
    const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    const findingsText = findings.join('\n\n');
    const uniquePromptSources = promptSources.join('\n');

    const systemPrompt = `你是一位严谨的深度研究员。当前日期是 ${currentDate}。请用Markdown格式撰写。`;
    const prompt = `
      主题: "${topic}"
      当前章节: "${chapterTitle}"
      
      研究材料 (Findings) - 包含具体的来源ID:
      ${findingsText}
      
      可用参考文献 (Sources):
      ${uniquePromptSources}
      
      任务: 撰写本章节内容。
      
      要求:
      1. **数据时效性**: 务必以 ${currentDate} 的视角进行写作。
      2. **学术语调**: 正式、客观、深度。简体中文。
      3. **篇幅**: 详尽（约 800-1500 字）。
      4. **引用规范 (关键)**: 
         - 研究材料中已标记了来源ID (如 "来源ID: [1], [2]")。
         - **必须**在文中引用事实、数据或观点时，在句尾使用上标数字 **[x]** 标注来源。
         - **严禁**使用 "[研究材料]"、"[资料]"、"[Source]" 或其他非数字引用。
         - **严禁**编造未出现在 "可用参考文献" 中的编号。
         - 例如: "根据最新报告显示，增长率为5% [1]。"
      5. **粗体与引号规范**:
         - **严禁**使用 **"文本"** 或 **“文本”** 的格式。
         - **必须**将引号放在粗体标记之外。
         - 正确示例: "**核心概念**" 或 "根据 **报告** 指出"。
      6. **可视化**: 必须包含一个 Mermaid.js 图表。
         - **Mermaid 规范**: 
           - 优先使用 \`graph TD\` (流程图), \`pie\` (饼图), \`sequenceDiagram\` (时序图) 等稳定语法。
           - **慎用 \`quadrantChart\`**: 仅在完全确定语法正确（需定义四个 quadrant 标签和 x-axis/y-axis 范围）时使用。若不确定，请改用普通图表，以免渲染错误。
           - 仅使用英文ID (NodeA)，严禁在图表代码中提及 "mermaid" 字眼，仅用 "下图展示..." 引出。
           - 节点文本用英文双引号。
      7. **纯净文本**: 除去引用标记 [x] 外，不要添加其他元数据标记。
      
      直接输出 Markdown 内容。
    `;

    const result = await this.generateText(prompt, model, systemPrompt);
    return { content: result.text, usage: result.usage || 0 };
  }
}