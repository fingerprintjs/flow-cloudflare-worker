import { Script } from '../scripts'
import injectorUrl from '../../../public/injector.iife.js?url'

export async function handleInjectScript(request: Request, script: Script, assets: Fetcher) {
  switch (script) {
    case 'injector.iife.js': {
      return assets.fetch(new URL(injectorUrl, request.url))
    }
  }
}
