import { datadogRum } from '@datadog/browser-rum'
import { datadogLogs } from '@datadog/browser-logs'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const DD_APP_ID     = import.meta.env.VITE_DD_APPLICATION_ID ?? ''
const DD_CLIENT_TOK = import.meta.env.VITE_DD_CLIENT_TOKEN   ?? ''
const DD_SITE       = import.meta.env.VITE_DD_SITE           ?? 'us3.datadoghq.com'
const DD_ENV        = import.meta.env.VITE_DD_ENV            ?? 'staging'

if (DD_APP_ID && DD_CLIENT_TOK) {
  datadogRum.init({
    applicationId:        DD_APP_ID,
    clientToken:          DD_CLIENT_TOK,
    site:                 DD_SITE,
    service:              'dataguard-frontend',
    env:                  DD_ENV,
    version:              '1.0.0',
    sessionSampleRate:    100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources:       true,
    trackLongTasks:       true,
    defaultPrivacyLevel:  'mask-user-input',
  })

  datadogLogs.init({
    clientToken:      DD_CLIENT_TOK,
    site:             DD_SITE,
    service:          'dataguard-frontend',
    env:              DD_ENV,
    forwardErrorsToLogs: true,
    sessionSampleRate: 100,
  })

  datadogRum.startSessionReplayRecording()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
