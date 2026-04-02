'use client';

export type ContentSegment =
  | { type: 'text'; content: string }
  | { type: 'tool-call'; toolName: string }
  | { type: 'tool-result'; toolName: string; result: string }
  | { type: 'tool-error'; error: string };

/**
 * 解析消息内容，将其拆分为不同的段落类型
 *
 * 匹配三种工具相关的文本模式：
 * - '\n> 正在执行：`toolName`...\n\n' -> tool-call
 * - '\n> ✅ [toolName] 返回结果：result\n\n' -> tool-result
 * - '\n> ⚠️ 执行遇到错误：error\n\n' -> tool-error
 *
 * 其余文本作为 text 段落返回
 */
export function parseMessageContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];

  // 定义三种工具模式的正则表达式
  const toolCallRegex = /\n> 正在执行：`(\w[\w.-]*)`...\n\n/g;
  const toolResultRegex = /\n> ✅ \[(\w[\w.-]*)\] 返回结果：(.+?)\n\n/g;
  const toolErrorRegex = /\n> ⚠️ 执行遇到错误：(.+?)\n\n/g;

  let lastIndex = 0;

  // 创建一个包含所有匹配信息的数组，按出现顺序排序
  const matches: Array<{
    type: 'tool-call' | 'tool-result' | 'tool-error';
    startIndex: number;
    endIndex: number;
    groups: string[];
  }> = [];

  // 查找所有工具调用模式匹配
  let match;
  while ((match = toolCallRegex.exec(content)) !== null) {
    matches.push({
      type: 'tool-call',
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      groups: match
    });
  }

  while ((match = toolResultRegex.exec(content)) !== null) {
    matches.push({
      type: 'tool-result',
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      groups: match
    });
  }

  while ((match = toolErrorRegex.exec(content)) !== null) {
    matches.push({
      type: 'tool-error',
      startIndex: match.index,
      endIndex: match.index + match[0].length,
      groups: match
    });
  }

  // 按照出现顺序排序所有匹配
  matches.sort((a, b) => a.startIndex - b.startIndex);

  // 构建段落数组
  for (const match of matches) {
    // 添加匹配之前的文本段落
    if (match.startIndex > lastIndex) {
      const textContent = content.substring(lastIndex, match.startIndex);
      if (textContent) {
        segments.push({ type: 'text', content: textContent });
      }
    }

    // 添加匹配的工具段落
    switch (match.type) {
      case 'tool-call':
        segments.push({ type: 'tool-call', toolName: match.groups[1] });
        break;
      case 'tool-result':
        segments.push({ type: 'tool-result', toolName: match.groups[1], result: match.groups[2] });
        break;
      case 'tool-error':
        segments.push({ type: 'tool-error', error: match.groups[1] });
        break;
    }

    // 更新最后索引
    lastIndex = match.endIndex;
  }

  // 添加最后剩余的文本
  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex);
    if (textContent) {
      segments.push({ type: 'text', content: textContent });
    }
  }

  return segments;
}