import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const pdfTemplateDir = path.resolve(rootDir, 'public/pdf-templates')
const pdfTemplateModuleId = 'virtual:pdf-template-files'
const resolvedPdfTemplateModuleId = `\0${pdfTemplateModuleId}`

function readPdfTemplateFiles() {
  if (!fs.existsSync(pdfTemplateDir)) {
    return []
  }

  return fs
    .readdirSync(pdfTemplateDir)
    .filter((fileName) => fileName.toLowerCase().endsWith('.pdf'))
    .sort((left, right) => left.localeCompare(right))
}

function pdfTemplateFilesPlugin(): Plugin {
  return {
    name: 'pdf-template-files',
    resolveId(id) {
      return id === pdfTemplateModuleId ? resolvedPdfTemplateModuleId : null
    },
    load(id) {
      if (id !== resolvedPdfTemplateModuleId) {
        return null
      }

      return `export default ${JSON.stringify(readPdfTemplateFiles())}`
    },
    configureServer(server) {
      server.watcher.add(pdfTemplateDir)

      const refreshTemplates = () => {
        const pdfTemplateModule = server.moduleGraph.getModuleById(
          resolvedPdfTemplateModuleId,
        )

        if (pdfTemplateModule) {
          server.moduleGraph.invalidateModule(pdfTemplateModule)
        }

        server.ws.send({ type: 'full-reload' })
      }

      server.watcher.on('add', (changedPath) => {
        if (path.dirname(changedPath) === pdfTemplateDir) {
          refreshTemplates()
        }
      })

      server.watcher.on('unlink', (changedPath) => {
        if (path.dirname(changedPath) === pdfTemplateDir) {
          refreshTemplates()
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: '/resume/',
  plugins: [pdfTemplateFilesPlugin(), react(), tailwindcss()],
})
