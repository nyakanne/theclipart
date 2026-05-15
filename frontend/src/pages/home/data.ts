import {
  AlertTriangle,
  Bell,
  ClipboardCheck,
  Database,
  Gavel,
  Hash,
  Map,
  Mail,
  Network,
  PhoneCall,
  ShieldCheck,
  Upload,
} from 'lucide-react'

import type { ExposureCategoryId } from '@/components/visuals/ExposureGraph'
import type { ExposureCounts } from './types'

export const DATA_BROKERS = [
  { name: 'FastPeopleSearch', url: 'https://www.fastpeoplesearch.com/removal', priority: 'CRITICAL', note: 'High-visibility people-search index' },
  { name: 'Spokeo', url: 'https://www.spokeo.com/optout', priority: 'CRITICAL', note: 'Major aggregator' },
  { name: 'WhitePages', url: 'https://www.whitepages.com/suppression-requests', priority: 'CRITICAL', note: 'Often feeds secondary listings' },
  { name: 'BeenVerified', url: 'https://www.beenverified.com/opt-out', priority: 'HIGH', note: 'People-search and background reports' },
  { name: 'Intelius', url: 'https://www.intelius.com/opt-out', priority: 'HIGH', note: 'Background-report network' },
  { name: 'Radaris', url: 'https://radaris.com/opt-out', priority: 'HIGH', note: 'Profile aggregation' },
  { name: 'MyLife', url: 'https://www.mylife.com/ccpa/index.php', priority: 'HIGH', note: 'Reputation/profile pages' },
  { name: 'PeopleFinder', url: 'https://www.peoplefinder.com/opt-out.php', priority: 'HIGH', note: 'People-search index' },
  { name: 'PeopleSmart', url: 'https://www.peoplesmart.com/optout-go', priority: 'HIGH', note: 'People-search index' },
  { name: 'TruthFinder', url: 'https://www.truthfinder.com/opt-out', priority: 'HIGH', note: 'Background reports' },
  { name: 'Instant Checkmate', url: 'https://www.instantcheckmate.com/opt-out', priority: 'HIGH', note: 'Background reports' },
  { name: 'ZabaSearch', url: 'https://www.zabasearch.com/block_records', priority: 'MEDIUM', note: 'Public-record search' },
  { name: 'FamilyTreeNow', url: 'https://www.familytreenow.com/optout', priority: 'MEDIUM', note: 'Family and address graph' },
  { name: 'PeekYou', url: 'https://www.peekyou.com/about/contact/optout', priority: 'MEDIUM', note: 'Username and profile index' },
  { name: 'Pipl', url: 'https://pipl.com/personal-information-removal-request', priority: 'MEDIUM', note: 'Personal-information removal request' },
  { name: '411.com', url: 'https://www.411.com/privacy', priority: 'MEDIUM', note: 'Contact directory' },
  { name: 'USSearch', url: 'https://www.ussearch.com/opt-out', priority: 'MEDIUM', note: 'Public-record search' },
  { name: 'PublicRecordsNow', url: 'https://www.publicrecordsnow.com/static/view/optout', priority: 'MEDIUM', note: 'Public-record search' },
  { name: 'Addresses.com', url: 'https://www.addresses.com/optout.php', priority: 'MEDIUM', note: 'Address directory' },
  { name: 'Nuwber', url: 'https://nuwber.com/removal/link', priority: 'MEDIUM', note: 'People-search profile pages' },
] as const

export const PLATFORM_REPORTS = [
  { name: 'Instagram', url: 'https://help.instagram.com/contact/504521742987441', note: 'Impersonation, harassment, privacy, intimate image abuse' },
  { name: 'Facebook', url: 'https://www.facebook.com/help/contact/144059062408922', note: 'Privacy violations and non-consensual intimate image reporting' },
  { name: 'TikTok', url: 'https://support.tiktok.com/en/safety-hc/report-a-problem', note: 'Doxxing, harassment, threats, impersonation, image abuse' },
  { name: 'Discord', url: 'https://discord.com/safety', note: 'User IDs, message links, server abuse, threats, doxxing' },
  { name: 'Google Abuse', url: 'https://support.google.com/mail/contact/abuse', note: 'Gmail abuse, threats, impersonation, harassment' },
  { name: 'FBI IC3', url: 'https://www.ic3.gov', note: 'Cyberstalking, sextortion, extortion, identity theft, account compromise' },
  { name: 'State Attorney General', url: 'https://www.naag.org/find-my-ag/', note: 'State privacy, consumer-protection, and data-broker complaints' },
] as const

export const LEGAL_SIGNALS = [
  { law: 'CCPA / CPRA', article: 'Cal. Civ. Code 1798.105', risk: 'Deletion rights for personal information held by businesses and data brokers.' },
  { law: 'California Delete Act', article: 'SB 362', risk: 'Centralized data-broker deletion workflow and broker registration duties.' },
  { law: 'FTC Act', article: 'Section 5', risk: 'Unfair or deceptive practices when a platform ignores abuse, privacy, or impersonation reports.' },
  { law: '18 U.S.C. 2261A', article: 'Cyberstalking', risk: 'Pattern of online conduct causing substantial emotional distress or reasonable fear.' },
  { law: 'NCII / NDII state laws', article: 'State-specific', risk: 'Non-consensual distribution or threat of distribution of intimate images.' },
  { law: 'Platform Terms', article: 'Safety policy', risk: 'Doxxing, harassment, impersonation, or sexual exploitation policy violations.' },
] as const

export const SUPPORT_RESOURCES = [
  { name: 'CCRI Image Abuse Helpline', url: 'tel:18448782274', detail: '1-844-878-2274, free 24/7 support in the US' },
  { name: 'Cyber Civil Rights Safety Center', url: 'https://cybercivilrights.org/ccri-crisis-helpline/', detail: 'Image-based sexual abuse support, referrals, and safety planning' },
  { name: 'StopNCII.org', url: 'https://stopncii.org/how-it-works/', detail: 'Adult intimate image hash case creation on participating platforms' },
  { name: 'NCMEC Take It Down', url: 'https://takeitdown.ncmec.org/', detail: 'Under-18 intimate image hash protection with NCMEC' },
] as const

export const TRACK_RESOURCES = [
  { name: 'Google Alerts', url: 'https://alerts.google.com', type: 'Monitoring', note: 'Monitor your name, known abusive handles, public URLs, and exact phrases from threats.' },
  { name: 'WhatsMyName', url: 'https://whatsmyname.app', type: 'Username check', note: 'Check known public usernames across platforms. Do not use this for harassment or doxxing.' },
  { name: 'Epieos', url: 'https://epieos.com', type: 'Authorized lookup', note: 'Use only for accounts you own, manage, or have explicit permission to investigate.' },
  { name: 'TinEye', url: 'https://tineye.com', type: 'Image evidence', note: 'Reverse-search profile or incident images you are allowed to use as evidence.' },
  { name: 'Google Lens', url: 'https://lens.google.com', type: 'Image evidence', note: 'Find reposts or visual matches for report documentation.' },
  { name: 'IC3', url: 'https://www.ic3.gov/', type: 'Authority report', note: 'Use for cyberstalking, sextortion, extortion, identity theft, or account compromise.' },
] as const

export const LIVE_SOURCE_ROWS: Array<{
  id: ExposureCategoryId
  label: string
  detail: string
}> = [
  { id: 'people', label: 'People-search profiles', detail: 'Name, relatives, addresses, aliases' },
  { id: 'brokers', label: 'Broker listings', detail: 'Aggregator and opt-out targets' },
  { id: 'records', label: 'Public record links', detail: 'Court, property, voter, directory traces' },
  { id: 'social', label: 'Social profile matches', detail: 'Handles, avatars, profile mirrors' },
  { id: 'breach', label: 'Breach and dark-web signals', detail: 'Credential, paste, and exposure indicators' },
  { id: 'ads', label: 'Ad-tech graph edges', detail: 'Marketing and audience data trails' },
]

export const OSINT_TOOLS = [
  { name: 'Have I Been Pwned', type: 'Email breach', url: 'https://haveibeenpwned.com/', query: 'email', note: 'Check emails you own for breach exposure.' },
  { name: 'Firefox Monitor', type: 'Email breach', url: 'https://monitor.mozilla.org/', query: 'email', note: 'Breach education and email exposure checks.' },
  { name: 'WhatsMyName', type: 'Username search', url: 'https://whatsmyname.app/', query: 'username', note: 'Check public username presence across platforms.' },
  { name: 'Epieos', type: 'Email / phone lookup', url: 'https://epieos.com/', query: 'email / phone', note: 'Use only for your own accounts or authorized safety work.' },
  { name: 'MXToolbox', type: 'Domain / mail records', url: 'https://mxtoolbox.com/', query: 'domain', note: 'Review domain, mail, blacklist, DNS, and WHOIS-style signals.' },
  { name: 'IPinfo', type: 'IP geolocation', url: 'https://ipinfo.io/', query: 'IP address', note: 'Rough IP ownership and network context for evidence notes.' },
] as const

export const EMAIL_BLAST_RECIPIENTS = [
  'Broker privacy teams',
  'Platform safety teams',
  'State attorney general',
  'Trusted contact / advocate',
  'Legal or campus safety contact',
] as const

export const PRIORITY_STYLES = {
  CRITICAL: 'border-red-500/40 bg-red-950/30 text-red-200',
  HIGH: 'border-red-400/30 bg-red-950/20 text-red-100',
  MEDIUM: 'border-white/15 bg-white/[0.04] text-gray-200',
}

export const SECOND_BRAIN_NODES = [
  { label: 'Phone numbers', x: '14%', y: '28%', icon: PhoneCall },
  { label: 'Addresses', x: '25%', y: '67%', icon: Map },
  { label: 'Emails', x: '34%', y: '16%', icon: Mail },
  { label: 'Social profiles', x: '68%', y: '20%', icon: Network },
  { label: 'Data brokers', x: '82%', y: '36%', icon: Database },
  { label: 'Images', x: '78%', y: '63%', icon: Upload },
  { label: 'Public records', x: '57%', y: '76%', icon: Gavel },
  { label: 'Evidence', x: '35%', y: '82%', icon: Hash },
  { label: 'Removals', x: '11%', y: '53%', icon: ClipboardCheck },
  { label: 'Alerts', x: '55%', y: '12%', icon: Bell },
] as const

export const SECOND_BRAIN_LINKS = [
  [0, 2], [0, 8], [1, 6], [1, 7], [2, 9], [2, 4], [3, 4], [3, 5], [4, 6], [5, 7], [6, 7], [7, 8], [8, 9], [9, 3],
] as const

export const COMMAND_MODULES = [
  { title: 'Exposure monitoring', value: '14 live surfaces', detail: 'Name, email, phone, handle, and address drift across public web signals.', icon: ShieldCheck },
  { title: 'Removals completed', value: '32 closed', detail: 'Broker tasks collapse into one verified chain of custody.', icon: ClipboardCheck },
  { title: 'Live alerts', value: '3 active', detail: 'New traces trigger the second brain before they spread.', icon: Bell },
  { title: 'Image monitoring', value: '12 tracked', detail: 'Reverse-image evidence stays linked to case notes and takedowns.', icon: Upload },
  { title: 'Evidence vault', value: '8 sealed', detail: 'Hash receipts, screenshots, exports, and authority packets.', icon: Hash },
  { title: 'Privacy reports', value: 'IC3 + State', detail: 'Premium regulator-ready reporting, not generic tickets.', icon: Gavel },
  { title: 'Live threat feed', value: 'Watching', detail: 'Escalation risk, broker intensity, and exposure pulses stay visible.', icon: AlertTriangle },
] as const

export const THREAT_FEED = [
  { time: '07:12', event: 'Fresh people-search mirror discovered', level: 'Critical' },
  { time: '07:18', event: 'Image repost correlation added to evidence vault', level: 'High' },
  { time: '07:26', event: 'Broker suppression confirmation received', level: 'Resolved' },
  { time: '07:33', event: 'New dark-web exposure signal scored for review', level: 'Elevated' },
] as const

export const DEFAULT_EXPOSURE_COUNTS: ExposureCounts = {
  people: 23,
  brokers: 47,
  records: 12,
  ads: 89,
  breach: 6,
  social: 19,
}
