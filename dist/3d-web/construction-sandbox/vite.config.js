import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({base:'./',build:{outDir:resolve(import.meta.dirname,'../../gpt6/construction-sandbox'),emptyOutDir:true}});
