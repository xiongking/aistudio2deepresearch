import { GoogleGenAI, Type } from "@google/genai";
import { ResearchConfig, ResearchLog, Source, Settings } from "../types";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class DeepResearchService {
  private googleAI: GoogleGenAI | null = null;
  private settings: Settings | null = null;
  private cancelFlag: boolean = false;

  constructor() {}

  /**
   * Initialize the AI client based on settings
   */
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

  /**
   * Universal AI Caller with Token Tracking
   */
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
      
      // Extract usage metadata
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
   * Generates Outline
   */
  private async generateOutline(topic: string, depth: number, model: string, currentDate: string): Promise<{ title: string; chapters: string[], usage: number }> {
    const chapterCount = depth === 1 ? 4 : depth === 2 ? 7 : 12;
    
    const systemPrompt = `你是一位专业的学术研究导师。当前时间是 ${currentDate}。请以JSON格式输出。`;
    const userPrompt = `
      主题: "${topic}"
      目标: 为一份博士级研究报告创建一个详细的目录（目标大约 ${chapterCount} 个主要章节）。
      
      要求:
      1. 标题必须具有学术性且描述性强，必须使用中文。
      2. 章节必须涵盖历史背景、技术机制、市场分析、挑战和未来展望等。
      3. **严禁包含“伦理考量”、“道德风险”或类似的章节**。请专注于技术、科学、经济或历史层面的深度。
      4. 逻辑流畅，层层递进。
      5. 输出必须完全使用简体中文。
      
      返回 JSON: { "title": "报告标题", "chapters": ["1. 绪论", "2. 文献综述...", ...] }
    `;

    try {
      const { text, usage } = await this.generateText(userPrompt, model, systemPrompt, true);
      const cleanText = text.replace(/```json\n|\n```/g, '');
      const json = JSON.parse(cleanText);
      
      if (!json.chapters || !Array.isArray(json.chapters)) {
          return { 
              title: json.title || topic, 
              chapters: ["研究背景", "核心技术分析", "市场现状", "挑战与机遇", "结论与展望"],
              usage: usage || 0
          };
      }
      return { ...json, usage: usage || 0 };
    } catch (e) {
      console.error("Outline failed", e);
      return { title: topic, chapters: ["研究背景", "核心分析", "结论"], usage: 0 };
    }
  }

  /**
   * Generates Queries
   */
  private async generateChapterQueries(topic: string, chapter: string, prevFindings: string[], model: string): Promise<{ queries: string[], usage: number }> {
    const systemPrompt = "你是一个搜索专家。请返回JSON字符串数组。";
    const prompt = `
      主题: "${topic}"
      章节: "${chapter}"
      前文背景摘要: ${prevFindings.slice(-3).join('; ')}
      
      生成 3 个非常具体、高价值的搜索查询，用于收集本章节的数据。
      重点关注统计数据、最新论文和技术细节。
      
      返回 JSON 数组: ["查询1", "查询2", "查询3"]
    `;
    
    try {
      const { text, usage } = await this.generateText(prompt, model, systemPrompt, true);
      const cleanText = text.replace(/```json\n|\n```/g, '');
      return { queries: JSON.parse(cleanText), usage: usage || 0 };
    } catch {
      return { queries: [`${topic} ${chapter} 数据`, `${topic} 统计`], usage: 0 };
    }
  }

  /**
   * Performs Search
   */
  private async search(query: string, model: string): Promise<{ summary: string; sources: Source[] }> {
    if (!this.settings) throw new Error("设置未初始化");

    // 1. Google Provider with Native Search
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
    
    // 2. OpenAI Provider (Simulated)
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
             sources: [{ title: "AI 内部知识库 (OpenAI)", uri: "#ai-simulated" }] 
         };
      } catch (e) {
          return { summary: "", sources: [] };
      }
    }
  }

  /**
   * Writes Chapter
   */
  private async writeChapter(
    topic: string, 
    chapterTitle: string, 
    findings: string[], 
    sources: Source[],
    model: string,
    currentDate: string
  ): Promise<{ content: string, usage: number }> {
    const findingsText = findings.join('\n\n');
    const systemPrompt = `你是一位严谨的博士后研究员。当前日期是 ${currentDate}。请用Markdown格式撰写。`;
    const prompt = `
      主题: "${topic}"
      当前章节: "${chapterTitle}"
      
      可用的研究发现:
      ${findingsText}
      
      任务: 撰写本章节的完整内容。
      
      要求:
      1. **学术语调**: 正式、客观、信息密度大。必须使用简体中文撰写。
      2. **篇幅**: 详尽的细节（约 800-1500 字）。
      3. **可视化**: 如果有合适的数据对比或流程，**必须**包含一个 Mermaid.js 图表（pie, graph, sequenceDiagram, classDiagram, gantt）。
         格式: \`\`\`mermaid ... \`\`\`
      4. **表格**: 如果有统计数据，**必须**使用Markdown表格展示。
      5. **引用**: 在正文中必须使用 [x] 格式标注引用。**严禁**在章节末尾列出参考文献列表（它们将被统一汇总在报告末尾）。
      6. **时效性**: 确保文中提及的时间点（如“今年”、“最近”）是基于 ${currentDate} 的。
      
      只写这一章的内容。不要写 "好的，这是章节内容" 之类的废话，直接输出 Markdown。
    `;

    const result = await this.generateText(prompt, model, systemPrompt);
    return { content: result.text, usage: result.usage || 0 };
  }

  /**
   * Main Process
   */
  async *startResearch(config: ResearchConfig, settings: Settings): AsyncGenerator<ResearchLog> {
    this.cancelFlag = false;
    this.initAI(settings); 

    const allSources: Source[] = [];
    const reportSections: string[] = [];
    const model = settings.model || (settings.provider === 'google' ? 'gemini-3-pro-preview' : 'gpt-4o');
    const currentDate = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    yield {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'plan',
      message: `深度研究协议启动`,
      details: [`任务: ${config.query}`, `日期基准: ${currentDate}`, `引擎: ${settings.provider.toUpperCase()}`]
    };

    // 1. Outline
    yield { id: crypto.randomUUID(), timestamp: Date.now(), type: 'info', message: "正在构建研究框架..." };
    const structure = await this.generateOutline(config.query, config.depth, model, currentDate);
    
    yield { 
      id: crypto.randomUUID(), 
      timestamp: Date.now(), 
      type: 'plan', 
      message: `核心架构已生成: ${structure.title}`,
      tokenCount: structure.usage,
      details: structure.chapters
    };

    // 2. Iterative Chapter Writing
    const chapterFindingsCache: string[] = []; 

    for (let i = 0; i < structure.chapters.length; i++) {
      this.checkCancelled();
      const chapter = structure.chapters[i];
      
      yield {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'info',
        message: `正在攻克章节 ${i+1}/${structure.chapters.length}: ${chapter}`
      };

      // A. Generate Queries
      const { queries, usage: queryTokens } = await this.generateChapterQueries(config.query, chapter, chapterFindingsCache, model);
      
      // B. Search
      const chapterFindings: string[] = [];
      const chapterSources: Source[] = [];
      
      for (const q of queries) {
        this.checkCancelled();
        yield { 
            id: crypto.randomUUID(), 
            timestamp: Date.now(), 
            type: 'search', 
            message: `深度检索: ${q}`,
            tokenCount: queryTokens // Attribute query gen tokens here roughly
        };
        
        await delay(500); // Rate limit buffer
        const res = await this.search(q, model);
        
        if (res.summary) chapterFindings.push(res.summary);
        if (res.sources && res.sources.length > 0) {
            chapterSources.push(...res.sources);
            // List sources in stream immediately
            yield {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                type: 'info',
                message: `发现信息源 (${res.sources.length})`,
                details: res.sources.map(s => `🔗 ${s.title} - ${s.uri}`)
            };
        }
      }
      
      allSources.push(...chapterSources);
      chapterFindingsCache.push(chapterFindings.join('\n').slice(0, 1000)); 

      // C. Write Chapter
      yield { id: crypto.randomUUID(), timestamp: Date.now(), type: 'writing', message: `正在撰写: ${chapter}` };
      
      const { content: chapterContent, usage: writeTokens } = await this.writeChapter(config.query, chapter, chapterFindings, chapterSources, model, currentDate);
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
    const uniqueSources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());
    const fullReport = `# ${structure.title}\n\n` + reportSections.join('\n\n') + `\n\n## 参考文献与引用\n` + uniqueSources.map((s,i) => `[${i+1}] ${s.title}: ${s.uri}`).join('\n');

    yield {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'info',
      message: "全流程结束。正在渲染最终报告。",
      details: { 
        completedResult: {
          title: structure.title,
          report: fullReport,
          sources: uniqueSources
        }
      }
    };
  }
}