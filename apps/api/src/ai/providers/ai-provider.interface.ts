export interface AiProvider {
  readonly name: 'OPENAI' | 'GEMINI';
  /**
   * `prompt` tayyor, to'liq promptni qabul qiladi va model qaytargan
   * xom matnni (JSON bo'lishi kutiladi) string sifatida qaytaradi.
   * JSON parsing chaqiruvchi tomonda (ai.service.ts) amalga oshiriladi,
   * chunki turli providerlar turlicha "javobni kafolatlash" mexanizmiga ega.
   */
  generateJson(prompt: string): Promise<string>;
}
