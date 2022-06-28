/**
 * 此文件一般不需要修改，只用来本地调试阶段用
 * 核心在测试src下暴露出来的组件
 */
import 'reflect-metadata'
import React from 'react'
import { history } from '@aliyun-sls/utils'
import { Route, Router } from 'react-router'
import { registerLogsearchResource } from '@aliyun-sls/logsearch'
import { registerDashboardResource } from '@aliyun-sls/dashboard'
import DemoApp from '@src/index'

registerDashboardResource()
registerLogsearchResource()
function App() {
  return (
    <Router history={history}>
      <Route path={'/'} component={DemoApp} />
    </Router>
  )
}

export default App
