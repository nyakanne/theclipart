const { randomUUID } = require('crypto')

const brokers = [
  ['FastPeopleSearch', 'https://www.fastpeoplesearch.com', 'https://www.fastpeoplesearch.com/removal', ['name', 'address', 'phone'], 45],
  ['Spokeo', 'https://www.spokeo.com', 'https://www.spokeo.com/optout', ['name', 'email', 'relatives'], 30],
  ['WhitePages', 'https://www.whitepages.com', 'https://www.whitepages.com/suppression-requests', ['name', 'phone', 'address'], 30],
  ['BeenVerified', 'https://www.beenverified.com', 'https://www.beenverified.com/opt-out', ['name', 'address', 'relatives', 'public_records'], 45],
  ['Intelius', 'https://www.intelius.com', 'https://www.intelius.com/opt-out', ['name', 'address', 'phone', 'relatives'], 45],
  ['Radaris', 'https://radaris.com', 'https://radaris.com/opt-out', ['name', 'age_range', 'address', 'associates'], 45],
  ['MyLife', 'https://www.mylife.com/ccpa/index.php', 'https://www.mylife.com/ccpa/index.php', ['name', 'reputation_profile', 'address'], 45],
  ['PeopleFinder', 'https://www.peoplefinder.com', 'https://www.peoplefinder.com/opt-out.php', ['name', 'phone', 'address'], 45],
  ['PeopleSmart', 'https://www.peoplesmart.com', 'https://www.peoplesmart.com/optout-go', ['name', 'email', 'phone'], 45],
  ['TruthFinder', 'https://www.truthfinder.com', 'https://www.truthfinder.com/opt-out', ['name', 'background_report', 'address'], 45],
  ['Instant Checkmate', 'https://www.instantcheckmate.com', 'https://www.instantcheckmate.com/opt-out', ['name', 'background_report', 'relatives'], 45],
  ['ZabaSearch', 'https://www.zabasearch.com', 'https://www.zabasearch.com/block_records', ['name', 'phone', 'address'], 45],
  ['FamilyTreeNow', 'https://www.familytreenow.com', 'https://www.familytreenow.com/optout', ['name', 'relatives', 'address_history'], 45],
  ['PeekYou', 'https://www.peekyou.com', 'https://www.peekyou.com/about/contact/optout', ['name', 'username', 'social_profiles'], 45],
  ['Pipl', 'https://pipl.com', 'https://pipl.com/personal-information-removal-request', ['name', 'email', 'social_profiles'], 45],
  ['411.com', 'https://www.411.com', 'https://www.411.com/privacy', ['name', 'phone', 'address'], 45],
  ['USSearch', 'https://www.ussearch.com', 'https://www.ussearch.com/opt-out', ['name', 'public_records', 'address'], 45],
  ['PublicRecordsNow', 'https://www.publicrecordsnow.com', 'https://www.publicrecordsnow.com/static/view/optout', ['name', 'public_records', 'address'], 45],
  ['Addresses.com', 'https://www.addresses.com', 'https://www.addresses.com/optout.php', ['name', 'address', 'phone'], 45],
  ['Nuwber', 'https://nuwber.com', 'https://nuwber.com/removal/link', ['name', 'address', 'phone', 'relatives'], 45],
]

function sendJson(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body)
  return new Promise((resolve) => {
    let raw = ''
    req.on('data', chunk => { raw += chunk })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
  })
}

function job(scanId, createdAt = new Date()) {
  return {
    scan_id: scanId,
    status: 'completed',
    progress: 100,
    current_stage: 'complete',
    estimated_seconds: 0,
    created_at: createdAt.toISOString(),
  }
}

function buildResult(scanId, query = {}) {
  const createdAt = new Date()
  const hasEmail = Boolean(query.email || scanId)
  const brokerListings = brokers.map(([name, url, optOutUrl, fields, deadline]) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    broker_name: name,
    broker_url: url,
    listing_url: null,
    fields_exposed: Array.from(new Set([...fields, hasEmail ? 'email' : null, query.username ? 'username' : null].filter(Boolean))),
    opt_out_url: optOutUrl,
    opt_out_status: 'not_started',
    opt_out_deadline_days: deadline,
    dsar_eligible: true,
    last_seen: createdAt.toISOString().slice(0, 10),
  }))
  const breaches = hasEmail ? [
    {
      id: randomUUID(),
      source: 'Demo breach corpus',
      source_type: 'breach_db',
      breach_date: '2024-10-12',
      discovered_date: createdAt.toISOString().slice(0, 10),
      severity: 'high',
      exposed_fields: ['email', 'username', 'password_hash'],
      record_count: 12840,
      description: 'Demo result showing how a verified breach record appears in the dashboard.',
      verified: true,
    },
    {
      id: randomUUID(),
      source: 'Demo paste and credential exposure',
      source_type: 'paste_site',
      breach_date: '2025-02-04',
      discovered_date: createdAt.toISOString().slice(0, 10),
      severity: 'medium',
      exposed_fields: ['email', 'username', 'ip_hint'],
      record_count: 426,
      description: 'Demo signal showing how paste-site or scraped exposure is evaluated for a report packet.',
      verified: false,
    },
  ] : []
  const totalExposures = breaches.length + brokerListings.length + 2
  const riskScore = breaches.length ? 86 : 64
  const complianceOverall = Math.max(22, 92 - Math.round(totalExposures * 2.5))

  return {
    scan_id: scanId,
    status: 'completed',
    created_at: createdAt.toISOString(),
    completed_at: createdAt.toISOString(),
    query,
    breaches,
    broker_listings: brokerListings,
    honey_token_hits: [
      {
        id: randomUUID(),
        token_id: 'VINDICA-WEB-MONITOR',
        token_type: 'email',
        hit_source: 'Demo monitoring source',
        hit_timestamp: createdAt.toISOString(),
        context_snippet: 'A monitored identifier resurfaced in a demo people-search index.',
      },
      {
        id: randomUUID(),
        token_id: 'VINDICA-SOCIAL-MONITOR',
        token_type: 'username',
        hit_source: 'Demo social profile index',
        hit_timestamp: createdAt.toISOString(),
        context_snippet: 'A username-like identifier appeared in a demo social profile trace.',
      },
    ],
    compliance: {
      overall: complianceOverall,
      gdpr_score: Math.max(20, complianceOverall - 3),
      ccpa_score: Math.max(20, complianceOverall - 8),
      risk_level: breaches.length ? 'high' : 'medium',
      violations: [
        {
          regulation: 'CCPA',
          article: 'Cal. Civ. Code 1798.105',
          description: 'Broker listings are eligible for deletion and opt-out workflow; failure to honor deletion may become a state privacy complaint.',
          severity: 'high',
          broker_name: 'FastPeopleSearch',
        },
        {
          regulation: 'CCPA',
          article: 'California Delete Act / SB 362',
          description: 'Multiple data-broker style sources indicate a recurring deletion queue should be maintained and documented.',
          severity: 'medium',
          broker_name: 'Data broker network',
        },
        {
          regulation: 'FTC',
          article: 'FTC Act Section 5 signal',
          description: 'Unclear privacy disclosures, ignored abuse reports, or deceptive removal flows should be documented for consumer-protection escalation.',
          severity: 'medium',
          broker_name: 'Platforms and brokers',
        },
        {
          regulation: 'NCII',
          article: 'State NCII / platform safety policy',
          description: 'If intimate imagery, sextortion, impersonation, or doxxing appears, preserve URLs and use StopNCII, Take It Down, CCRI, IC3, and platform reports.',
          severity: 'high',
          broker_name: 'Authority report packet',
        },
      ],
      recommendations: [
        'Submit priority removals to critical brokers first and save confirmation receipts.',
        'Create a platform takedown packet for doxxing, impersonation, harassment, or NCII content.',
        'Use StopNCII or NCMEC Take It Down for eligible intimate image hashing scenarios.',
        'Export an IC3/state privacy packet after collecting URLs, screenshots, timestamps, and hashes.',
      ],
    },
    total_exposures: totalExposures,
    risk_score: riskScore,
  }
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'https://vindica.local')
  const parts = url.pathname.replace(/^\/api\/v1\/?/, '').split('/').filter(Boolean)

  if (req.method === 'GET' && parts[0] === 'health') {
    return sendJson(res, 200, { status: 'ok', env: 'vercel-demo' })
  }

  if (parts[0] !== 'scans') {
    return sendJson(res, 404, { detail: 'Not found' })
  }

  if (req.method === 'POST' && parts.length === 1) {
    const body = await readBody(req)
    if (!body.email && !body.phone && !body.username && !body.full_name) {
      return sendJson(res, 400, { detail: 'Provide at least one identifier.' })
    }
    const scanId = randomUUID().replace(/-/g, '')
    return sendJson(res, 201, job(scanId))
  }

  if (req.method === 'GET' && parts.length === 1) {
    return sendJson(res, 200, [])
  }

  const scanId = parts[1]
  if (!scanId) return sendJson(res, 404, { detail: 'Scan not found' })

  if (req.method === 'GET' && parts[2] === 'status') {
    return sendJson(res, 200, job(scanId))
  }

  if (req.method === 'GET' && parts.length === 2) {
    return sendJson(res, 200, buildResult(scanId, { email: 'demo@example.com' }))
  }

  if (req.method === 'GET' && parts[2] === 'dsar') {
    return sendJson(res, 200, [])
  }

  if (req.method === 'POST' && parts[2] === 'opt-out' && parts[3] === 'all') {
    return sendJson(res, 200, { queued: brokers.length, skipped: 0, status: 'demo_queued', message: 'Demo deployment queued opt-out tasks without transmitting personal data.' })
  }

  if (req.method === 'POST' && parts[2] === 'opt-out') {
    return sendJson(res, 200, { status: 'in_progress', broker_id: parts[3], message: 'Demo deployment staged this opt-out without transmitting personal data.' })
  }

  if (req.method === 'POST' && parts[2] === 'dsar' && parts[3] === 'send-all') {
    return sendJson(res, 200, brokers.slice(0, 3).map(([name]) => ({
      id: randomUUID(),
      scan_id: scanId,
      broker_listing_id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      broker_name: name,
      status: 'sent',
      sent_at: new Date().toISOString(),
      deadline_at: new Date(Date.now() + 30 * 864e5).toISOString(),
      response: 'Demo DSAR staged.',
    })))
  }

  if (req.method === 'POST' && parts[2] === 'dsar') {
    return sendJson(res, 200, {
      id: randomUUID(),
      scan_id: scanId,
      broker_listing_id: parts[3],
      broker_name: parts[3] || 'Demo broker',
      status: 'sent',
      sent_at: new Date().toISOString(),
      deadline_at: new Date(Date.now() + 30 * 864e5).toISOString(),
      response: 'Demo DSAR staged.',
    })
  }

  if (req.method === 'POST' && parts[2] === 'report') {
    const body = await readBody(req)
    const format = body.format || 'pdf'
    const now = new Date()
    return sendJson(res, 200, {
      scan_id: scanId,
      generated_at: now.toISOString(),
      download_url: `/api/v1/scans/${scanId}/demo-report.${format}`,
      format,
      includes_dsar: true,
      includes_compliance: true,
      expires_at: new Date(now.getTime() + 3600000).toISOString(),
    })
  }

  if (req.method === 'GET' && parts[2] && parts[2].startsWith('demo-report.')) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end(`Vindica demo report for scan ${scanId}\nGenerated: ${new Date().toISOString()}\nThis public preview does not transmit personal data.`)
    return
  }

  return sendJson(res, 404, { detail: 'Not found' })
}
