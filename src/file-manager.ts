import { McpServer } from "@modelcontextprotocol/server"
import { serveStdio } from "@modelcontextprotocol/server/stdio"
import { z } from "zod"
import { PDFParse } from "pdf-parse"
import { listFiles, resolveSafePath } from "./utils.js"
import * as fs from "fs/promises"
import * as path from "path"

function createServer() {
    const server = new McpServer({
        name: "file-manager-app",
        version: "1.0.0"

    })

    server.registerTool(
        "list_files",
        {
            description: "List files in a directory",
            inputSchema: z.object({
                directory: z
                    .string()
                    .describe("Directory to list (e.g., C:\\\\Users\\\\Documents")
            })
        },
        async ({ directory }) => {
            const resolvedPath = await resolveSafePath(directory)
            const files = await listFiles(resolvedPath)
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({ total: files.length, files }, null, 2),
                    },
                ],
            }
        }
    )

    server.registerTool(
        "read_file",
        {
            description: "Reads the textual content of simple text files (.txt, .md, .json, .html).",
            inputSchema: z.object({
                filePath: z
                    .string()
                    .describe("Path to the file to be read (e.g., C:\\\\Users\\\\User\\\\Documents\\\\file.txt)")
            }),
        },
        async ({ filePath }) => {
            const resolvedPath = await resolveSafePath(filePath)
            const content = await fs.readFile(resolvedPath, "utf-8")
            return {
                content: [
                    {
                        type: "text",
                        text: content
                    }]
            }
        }
    )

    server.registerTool(
        "write_file",
        {
            description: "Writes content to a text file.",
            inputSchema: z.object({
                filePath: z
                    .string()
                    .describe("Path to the file to be written (e.g., C:\\\\Users\\\\User\\\\Documents\\\\file.txt)"),
                content: z
                    .string()
                    .describe("The content to write to the file")
            })
        },
        async ({ filePath, content }) => {
            const resolvedPath = await resolveSafePath(filePath)
            await fs.mkdir(path.dirname(resolvedPath), { recursive: true })
            await fs.writeFile(resolvedPath, content, "utf-8")
            return {
                content: [
                    {
                        type: "text",
                        text: `File written successfully to ${resolvedPath}`
                    }]
            }
        }
    )

    //PDF
    server.registerTool(
        'read_pdf',
        {
            description: "Reads a PDF file content",
            inputSchema: z.object({
                filePath: z
                    .string()
                    .describe("Path to the file to be read (e.g., C:\\\\Users\\\\User\\\\Documents\\\\file.pdf)")
            }),
        },
        async ({ filePath }) => {
            const resolvedPath = await resolveSafePath(filePath)
            const buffer = await fs.readFile(resolvedPath)
            const parsedPdf = new PDFParse({ data: buffer })
            const content = (await parsedPdf.getText()).text

            return {
                content: [
                    {
                        type: "text",
                        text: content
                    }]
            }
        }
    )

    return server

}

serveStdio(createServer, {
    onerror: (error) => console.error("File Manager App: MCP Server error:", error),
})

console.error("File Manager App: MCP Server running on stdio")