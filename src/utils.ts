import * as fs from "fs/promises"
import * as path from "path"

// Pastas permitidas, vindas da variável de ambiente (separadas por ";" no Windows, ":" no Linux/macOS)
const ALLOWED_ROOTS = (process.env.ALLOWED_DIRS ?? process.cwd())
    .split(path.delimiter)
    .filter(Boolean)
    .map((p) => path.resolve(p))

// realpath resolve symlinks; se o arquivo ainda não existe (write_file),
// resolve o ancestral existente mais próximo e anexa o restante
async function realpathOrParent(target: string): Promise<string> {
    try {
        return await fs.realpath(target)
    } catch {
        const parent = path.dirname(target)
        if (parent === target) return target
        return path.join(await realpathOrParent(parent), path.basename(target))
    }
}

function isInside(root: string, target: string): boolean {
    const rel = path.relative(root, target)
    return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel))
}

export async function resolveSafePath(input: string): Promise<string> {
    const real = await realpathOrParent(path.resolve(input))
    const roots = await Promise.all(ALLOWED_ROOTS.map(realpathOrParent))
    if (!roots.some((root) => isInside(root, real))) {
        throw new Error(`Acesso negado: ${input} está fora das pastas permitidas`)
    }
    return real
}


export async function listFiles(directory: string, fileList: string[] = []) {
    try {
        // fs.promises.access substitui o existsSync (ela lança erro se o arquivo não existir)
        await fs.access(directory)
    } catch {
        return [] // Diretório não existe
    }

    const files = await fs.readdir(directory)

    for (const item of files) {
        const fullPath = path.join(directory, item)
        const stat = await fs.stat(fullPath)

        if (stat.isDirectory()) {
            await listFiles(fullPath, fileList)
        }
        else {
            fileList.push(fullPath)
        }

    }
    return fileList
}