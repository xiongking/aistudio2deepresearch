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
      // For OpenAI, we don't need a client instance, we use fetch directly in the calls
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
   * Universal AI Caller
   */
  private async generateText(prompt: string, model: string, systemInstruction?: string, jsonMode?: boolean): Promise<string> {
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
      return response.text || "";
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
      return data.choices?.[0]?.message?.content || "";
    }
  }

  /**
   * Generates Outline
   */
  private async generateOutline(topic: string, depth: number, model: string): Promise<{ title: string; chapters: string[] }> {
    const chapterCount = depth === 1 ? 4 : depth === 2 ? 7 : 12;
    
    const systemPrompt = "你是一位专业的学术研究导师。请以JSON格式输出。";
    const userPrompt = `
      主题: "${topic}"
      目标: 为一份博士级研究报告创建一个详细的目录（目标大约 ${chapterCount} 个主要章节）。
      
      要求:
      1. 标题必须具有学术性且描述性强，必须使用中文。
      2. 章节必须涵盖历史背景、技术机制、市场分析、挑战、伦理考量和未来展望等。
      3. 逻辑流畅，层层递进。
      4. 输出必须完全使用简体中文。
      
      返回 JSON: { "title": "报告标题", "chapters": ["1. 绪论", "2. 文献综述...", ...] }
    `;

    try {
      const text = await this.generateText(userPrompt, model, systemPrompt, true);
      // Clean up markdown block if present
      const cleanText = text.replace(/```json\n|\n```/g, '');
      const json = JSON.parse(cleanText);
      
      if (!json.chapters || !Array.isArray(json.chapters)) {
          return { 
              title: json.title || topic, 
              chapters: ["研究背景", "核心技术分析", "市场现状", "挑战与机遇", "结论与展望"] 
          };
      }
      return json;
    } catch (e) {
      console.error("Outline failed", e);
      return { title: topic, chapters: ["研究背景", "核心分析", "结论"] };
    }
  }

  /**
   * Generates Queries
   */
  private async generateChapterQueries(topic: string, chapter: string, prevFindings: string[], model: string): Promise<string[]> {
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
      const text = await this.generateText(prompt, model, systemPrompt, true);
      const cleanText = text.replace(/```json\n|\n```/g, '');
      return JSON.parse(cleanText);
    } catch {
      return [`${topic} ${chapter} 数据`, `${topic} 统计`];
    }
  }

  /**
   * Performs Search
   * Note: OpenAI provider simulates search using LLM knowledge because it lacks a native search tool.
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
    
    // 2. OpenAI Provider (Simulated Search / Internal Knowledge)
    else {
      // In a real app, you would use Serper/Tavily API here. 
      // For this simplified version, we ask the LLM to act as a knowledge base.
      const prompt = `
        你是一个拥有即时互联网知识的搜索引擎。
        请针对以下查询提供详细的、基于事实的摘要，包含数据、日期和关键实体。
        查询: "${query}"
        
        如果可能，请在文末列出你所知道的该领域权威来源（虽然你不能浏览，但你可以列出通常发布此类数据的机构名称）。
      `;
      try {
         const text = await this.generateText(prompt, model, "You are a helpful research assistant.");
         return { 
             summary: text, 
             sources: [{ title: "AI 内部知识库", uri: "#ai-generated" }] 
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
    model: string
  ): Promise<string> {
    const findingsText = findings.join('\n\n');
    const systemPrompt = "你是一位严谨的博士后研究员。请用Markdown格式撰写。";
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
      6. **格式**: 使用 Markdown H2, H3, H4, 表格, 列表。
      
      只写这一章的内容。不要写 "好的，这是章节内容" 之类的废话，直接输出 Markdown。
    `;

    return await this.generateText(prompt, model, systemPrompt);
  }

  /**
   * Main Process
   */
  async *startResearch(config: ResearchConfig, settings: Settings): AsyncGenerator<ResearchLog> {
    this.cancelFlag = false;
    this.initAI(settings); // Re-init with latest settings

    const allSources: Source[] = [];
    const reportSections: string[] = [];
    // Default fallback models if string is empty
    const model = settings.model || (settings.provider === 'google' ? 'gemini-3-pro-preview' : 'gpt-4o');
    
    yield {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'plan',
      message: `深度研究协议启动`,
      details: [`任务: ${config.query}`, `引擎: ${settings.provider.toUpperCase()} / ${model}`]
    };

    // 1. Outline
    yield { id: crypto.randomUUID(), timestamp: Date.now(), type: 'info', message: "正在构建研究框架..." };
    const structure = await this.generateOutline(config.query, config.depth, model);
    
    yield { 
      id: crypto.randomUUID(), 
      timestamp: Date.now(), 
      type: 'plan', 
      message: `核心架构已生成: ${structure.title}`,
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
      const queries = await this.generateChapterQueries(config.query, chapter, chapterFindingsCache, model);
      
      // B. Search
      const chapterFindings: string[] = [];
      const chapterSources: Source[] = [];
      
      for (const q of queries) {
        this.checkCancelled();
        yield { id: crypto.randomUUID(), timestamp: Date.now(), type: 'search', message: `深度检索: ${q}` };
        
        await delay(300); 
        const res = await this.search(q, model);
        
        if (res.summary) chapterFindings.push(res.summary);
        if (res.sources) chapterSources.push(...res.sources);
        
        yield { 
          id: crypto.randomUUID(), 
          timestamp: Date.now(), 
          type: 'analysis', 
          message: `数据源解析: 获得 ${res.sources.length} 条有效信息` 
        };
      }
      
      allSources.push(...chapterSources);
      chapterFindingsCache.push(chapterFindings.join('\n').slice(0, 1000)); 

      // C. Write Chapter
      yield { id: crypto.randomUUID(), timestamp: Date.now(), type: 'writing', message: `正在撰写: ${chapter}` };
      
      const chapterContent = await this.writeChapter(config.query, chapter, chapterFindings, chapterSources, model);
      reportSections.push(chapterContent);

      yield {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'info',
        message: `章节 ${i+1} 完成`,
        details: { partialSection: chapterContent } 
      };
    }

    // 3. Final Compilation
    const uniqueSources = Array.from(new Map(allSources.map(s => [s.uri, s])).values());
    // Only place references at the VERY END
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