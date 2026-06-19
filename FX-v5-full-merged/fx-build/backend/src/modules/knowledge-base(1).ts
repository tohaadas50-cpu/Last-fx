import * as fs from 'fs'
import * as path from 'path'

/**
 * Knowledge Base (RAG Engine)
 * 
 * Implements "Zero-Cost Training" via Retrieval Augmented Generation.
 * - Reads text/markdown files from `docs/library`
 * - Retrieves relevant snippets based on keywords
 * - Injects these snippets into the AI prompt
 */

export interface KnowledgeSnippet {
    source: string
    content: string
    relevance: number
}

const LIBRARY_PATH = path.join(__dirname, '../../../docs/library')

// Ensure library exists
if (!fs.existsSync(LIBRARY_PATH)) {
    fs.mkdirSync(LIBRARY_PATH, { recursive: true })
}

/**
 * Retrieve relevant knowledge from the user's library
 */
export async function retrieveKnowledge(query: string, limit: number = 3): Promise<KnowledgeSnippet[]> {
    try {
        const files = fs.readdirSync(LIBRARY_PATH).filter(f => f.endsWith('.md') || f.endsWith('.txt'))

        if (files.length === 0) {
            return []
        }

        const snippets: KnowledgeSnippet[] = []

        for (const file of files) {
            const content = fs.readFileSync(path.join(LIBRARY_PATH, file), 'utf-8')
            const relevance = calculateRelevance(query, content)

            if (relevance > 0) {
                snippets.push({
                    source: file,
                    content: truncateContent(content, 500), // simple chunking
                    relevance
                })
            }
        }

        return snippets.sort((a, b) => b.relevance - a.relevance).slice(0, limit)

    } catch (error) {
        console.warn('Knowledge retrieval failed:', error)
        return []
    }
}

/**
 * Simple relevance scoring (Keyword Match)
 * In production, this would use Vector Embeddings (OpenAI Embeddings)
 */
function calculateRelevance(query: string, content: string): number {
    const queryTerms = query.toLowerCase().split(' ').filter(w => w.length > 3)
    const contentLower = content.toLowerCase()

    let score = 0
    for (const term of queryTerms) {
        const matches = (contentLower.match(new RegExp(term, 'g')) || []).length
        score += matches
    }

    return score
}

function truncateContent(content: string, length: number): string {
    if (content.length <= length) return content
    return content.substring(0, length) + '...'
}

export function getKnowledgeInjectPrompt(snippets: KnowledgeSnippet[]): string {
    if (snippets.length === 0) return ''

    return `
### BRAND KNOWLEDGE & STYLE GUIDE
(Reference these external materials for tone and strategy)

${snippets.map(s => `SOURCE: ${s.source}\n---\n${s.content}\n---`).join('\n\n')}

INSTRUCTION: Align your creative output with the tone and principles found explicitly in the text above.
`
}
