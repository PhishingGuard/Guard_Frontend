import { TabBar } from './components/Layout'
import { useRoute } from './lib/router'
import { Admin } from './screens/Admin'
import { AlertDetail, Alerts } from './screens/Alerts'
import { Ask } from './screens/Ask'
import { Checking } from './screens/Checking'
import { Home } from './screens/Home'
import { Report } from './screens/Report'
import { Result } from './screens/Result'
import { Settings } from './screens/Settings'
import { Stats } from './screens/Stats'
import './App.css'

// 탭바를 보여 줄 최상위 화면
const TAB_ROOTS = new Set(['', 'alerts', 'stats', 'ask', 'settings'])

function App() {
  const { path, query } = useRoute()
  const [section = '', param] = path
  const isTabRoot = TAB_ROOTS.has(section) && !param && !(section === 'ask' && query.get('check'))

  let screen
  switch (section) {
    case '':
      screen = <Home />
      break
    case 'checking':
      screen = <Checking />
      break
    case 'result':
      screen = param ? <Result id={param} /> : <Home />
      break
    case 'report':
      screen = <Report checkId={param} />
      break
    case 'alerts':
      screen = param ? <AlertDetail id={Number(param)} /> : <Alerts />
      break
    case 'stats':
      screen = <Stats />
      break
    case 'ask':
      screen = <Ask checkId={query.get('check') ?? undefined} />
      break
    case 'settings':
      screen = <Settings />
      break
    case 'admin':
      screen = <Admin />
      break
    default:
      screen = <Home />
  }

  return (
    <div className={`app${isTabRoot ? ' with-tabbar' : ''}`}>
      {/* 경로가 바뀌면 화면 상태를 새로 시작 */}
      <main key={path.join('/') + '?' + query.toString()}>{screen}</main>
      {isTabRoot && <TabBar active={section} />}
    </div>
  )
}

export default App
