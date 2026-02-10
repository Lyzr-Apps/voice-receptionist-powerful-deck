'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Phone, PhoneOff, Search, Plus, Trash2, Upload, X, Check, AlertCircle, FileText, Home as HomeIcon, MessageSquare, Clock, Settings, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Mail, Archive, Eye, Filter, ChevronRight, BarChart2, Volume2, Sparkles } from 'lucide-react'
import { uploadAndTrainDocument, getDocuments, deleteDocuments, useRAGKnowledgeBase } from '@/lib/ragKnowledgeBase'

// Constants
const VOICE_AGENT_ID = '698bba36f0ec4d8b7099bf4d'
const RAG_ID = '698bba2567a82d6d27bdde7c'

// Types
interface CallRecord {
  id: string
  callerId: string
  time: string
  duration: string
  outcome: string
  date: string
  transcript?: string
}

interface MessageRecord {
  id: string
  callerName: string
  phone: string
  time: string
  date: string
  status: string
  message: string
  urgency: string
}

interface TranscriptEntry {
  role: string
  text: string
  timestamp?: string
}

interface FAQEntry {
  id: string
  question: string
  answer: string
}

interface Department {
  id: string
  name: string
  extension: string
  instructions: string
}

// Mock Data
const MOCK_CALLS: CallRecord[] = [
  { id: '1', callerId: '+1 (555) 234-5678', time: '9:15 AM', duration: '3:42', outcome: 'Answered', date: '2025-02-10', transcript: 'Caller inquired about dental cleaning availability. Receptionist confirmed next available slot on Thursday at 2 PM. Caller agreed and appointment was booked.' },
  { id: '2', callerId: '+1 (555) 876-5432', time: '10:30 AM', duration: '1:15', outcome: 'Message', date: '2025-02-10', transcript: 'Caller requested callback regarding rescheduling a dental cleaning appointment. Message recorded for Sarah Johnson.' },
  { id: '3', callerId: '+1 (555) 345-6789', time: '11:45 AM', duration: '5:20', outcome: 'Transferred', date: '2025-02-10', transcript: 'Caller needed to discuss billing issue with insurance claim. Transferred to billing department at extension 204.' },
  { id: '4', callerId: '+1 (555) 456-7890', time: '1:00 PM', duration: '2:30', outcome: 'Answered', date: '2025-02-10', transcript: 'New patient inquiry about initial consultation pricing and insurance acceptance. Provided information about accepted plans and scheduled consultation.' },
  { id: '5', callerId: '+1 (555) 567-8901', time: '2:15 PM', duration: '4:10', outcome: 'Message', date: '2025-02-10', transcript: 'Caller interested in premium dental implant services. Left detailed message with insurance information for callback.' },
  { id: '6', callerId: '+1 (555) 678-9012', time: '3:30 PM', duration: '1:50', outcome: 'Answered', date: '2025-02-09', transcript: 'Follow-up call about post-procedure care instructions. Provided detailed care guidelines.' },
  { id: '7', callerId: '+1 (555) 789-0123', time: '4:45 PM', duration: '6:15', outcome: 'Transferred', date: '2025-02-09', transcript: 'Complex insurance pre-authorization question. Transferred to insurance coordinator.' },
  { id: '8', callerId: '+1 (555) 890-1234', time: '5:00 PM', duration: '0:45', outcome: 'Missed', date: '2025-02-09', transcript: '' },
]

const MOCK_MESSAGES: MessageRecord[] = [
  { id: '1', callerName: 'Sarah Johnson', phone: '+1 (555) 876-5432', time: '10:30 AM', date: '2025-02-10', status: 'unread', message: 'Hi, I was calling about the dental cleaning appointment I scheduled for next week. I need to reschedule to Thursday if possible. Please call me back at your earliest convenience. Thank you!', urgency: 'normal' },
  { id: '2', callerName: 'Michael Chen', phone: '+1 (555) 567-8901', time: '2:15 PM', date: '2025-02-10', status: 'unread', message: 'I am interested in your premium dental implant services. Could someone please call me back to discuss pricing and available appointments? I have dental insurance through BlueCross.', urgency: 'normal' },
  { id: '3', callerName: 'Emily Rodriguez', phone: '+1 (555) 345-9876', time: '4:30 PM', date: '2025-02-09', status: 'read', message: 'My child has a toothache and I need to bring them in as soon as possible. This is somewhat urgent. Please let me know your next available slot for pediatric dentistry.', urgency: 'high' },
  { id: '4', callerName: 'David Thompson', phone: '+1 (555) 234-8765', time: '11:00 AM', date: '2025-02-09', status: 'read', message: 'Following up on my insurance claim from my last visit on January 15th. The claim number is CLM-2025-0892. Please have your billing department reach out to me.', urgency: 'normal' },
  { id: '5', callerName: 'Lisa Park', phone: '+1 (555) 678-1234', time: '9:00 AM', date: '2025-02-08', status: 'archived', message: 'I wanted to confirm my whitening appointment for next Monday at 2 PM. Also, do I need to avoid any foods beforehand? Thank you!', urgency: 'low' },
]

const DEFAULT_FAQS: FAQEntry[] = [
  { id: '1', question: 'What are your office hours?', answer: 'We are open Monday through Friday, 8:00 AM to 5:00 PM. Saturday hours are 9:00 AM to 1:00 PM by appointment only.' },
  { id: '2', question: 'Do you accept walk-ins?', answer: 'We prefer appointments but can accommodate walk-ins based on availability. For emergencies, we always make room.' },
  { id: '3', question: 'What insurance do you accept?', answer: 'We accept most major dental insurance plans including Delta Dental, BlueCross BlueShield, Aetna, Cigna, and MetLife.' },
]

const DEFAULT_DEPARTMENTS: Department[] = [
  { id: '1', name: 'General Dentistry', extension: '201', instructions: 'Transfer calls about routine cleanings, checkups, and general dental concerns.' },
  { id: '2', name: 'Billing & Insurance', extension: '204', instructions: 'Transfer calls about payment, insurance claims, and billing inquiries.' },
  { id: '3', name: 'Orthodontics', extension: '207', instructions: 'Transfer calls about braces, aligners, and orthodontic consultations.' },
]

// Utility: outcome icon
function OutcomeIcon({ outcome }: { outcome: string }) {
  switch (outcome) {
    case 'Answered':
      return <PhoneIncoming className="w-4 h-4 text-emerald-600" />
    case 'Message':
      return <Mail className="w-4 h-4 text-amber-600" />
    case 'Transferred':
      return <PhoneOutgoing className="w-4 h-4 text-blue-600" />
    case 'Missed':
      return <PhoneMissed className="w-4 h-4 text-red-500" />
    default:
      return <PhoneCall className="w-4 h-4 text-muted-foreground" />
  }
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const variants: Record<string, string> = {
    'Answered': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Message': 'bg-amber-100 text-amber-800 border-amber-200',
    'Transferred': 'bg-blue-100 text-blue-800 border-blue-200',
    'Missed': 'bg-red-100 text-red-800 border-red-200',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variants[outcome] ?? 'bg-muted text-muted-foreground border-border'}`}>
      <OutcomeIcon outcome={outcome} />
      {outcome}
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  const variants: Record<string, string> = {
    'high': 'bg-red-100 text-red-800 border-red-200',
    'normal': 'bg-blue-100 text-blue-800 border-blue-200',
    'low': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[urgency] ?? 'bg-muted text-muted-foreground border-border'}`}>
      {urgency === 'high' ? 'Urgent' : urgency === 'normal' ? 'Normal' : 'Low'}
    </span>
  )
}

// Sidebar navigation items
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'history', label: 'Call History', icon: Clock },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// ===== DASHBOARD SCREEN =====
function DashboardScreen({
  receptionistActive,
  setReceptionistActive,
  calls,
  messages,
  setActiveScreen,
  onStartVoice,
  isVoiceActive,
  isVoiceConnecting,
  voiceTranscript,
  isThinking,
  voiceError,
  onEndVoice,
  sampleData,
}: {
  receptionistActive: boolean
  setReceptionistActive: (v: boolean) => void
  calls: CallRecord[]
  messages: MessageRecord[]
  setActiveScreen: (s: string) => void
  onStartVoice: () => void
  isVoiceActive: boolean
  isVoiceConnecting: boolean
  voiceTranscript: TranscriptEntry[]
  isThinking: boolean
  voiceError: string
  onEndVoice: () => void
  sampleData: boolean
}) {
  const todayCalls = calls.filter(c => c.date === '2025-02-10')
  const answeredToday = todayCalls.filter(c => c.outcome === 'Answered').length
  const messagesCount = todayCalls.filter(c => c.outcome === 'Message').length
  const unreadMessages = messages.filter(m => m.status === 'unread')

  const totalMinutes = todayCalls.reduce((sum, c) => {
    const parts = c.duration.split(':')
    return sum + (parseInt(parts[0] ?? '0', 10) * 60) + parseInt(parts[1] ?? '0', 10)
  }, 0)
  const avgDuration = todayCalls.length > 0 ? Math.round(totalMinutes / todayCalls.length) : 0
  const avgMin = Math.floor(avgDuration / 60)
  const avgSec = avgDuration % 60

  return (
    <div className="space-y-6">
      {/* Status + Voice Session Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Receptionist Status */}
        <Card className="bg-card border-border/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg tracking-tight">Receptionist Status</CardTitle>
            <CardDescription>AI Voice Receptionist control panel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${receptionistActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
                <span className="font-medium text-foreground">{receptionistActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="receptionist-toggle" className="text-sm text-muted-foreground">
                  {receptionistActive ? 'On' : 'Off'}
                </Label>
                <Switch id="receptionist-toggle" checked={receptionistActive} onCheckedChange={setReceptionistActive} />
              </div>
            </div>
            {receptionistActive && (
              <p className="mt-3 text-xs text-muted-foreground">Handling incoming calls and taking messages automatically.</p>
            )}
          </CardContent>
        </Card>

        {/* Voice Session Card */}
        <Card className="bg-card border-border/30 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="font-serif text-lg tracking-tight flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-primary" />
              Voice Session
            </CardTitle>
            <CardDescription>Test the receptionist by starting a live voice call</CardDescription>
          </CardHeader>
          <CardContent>
            {!isVoiceActive ? (
              <div className="space-y-3">
                <Button onClick={onStartVoice} disabled={isVoiceConnecting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  {isVoiceConnecting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connecting...</>
                  ) : (
                    <><Phone className="w-4 h-4 mr-2" />Start Voice Session</>
                  )}
                </Button>
                {voiceError && (
                  <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{voiceError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-700">Live</span>
                  </div>
                  <Button variant="destructive" size="sm" onClick={onEndVoice}>
                    <PhoneOff className="w-4 h-4 mr-1" />End Call
                  </Button>
                </div>
                {isThinking && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />AI is thinking...
                  </div>
                )}
                {voiceTranscript.length > 0 && (
                  <ScrollArea className="h-24 rounded-md border border-border/30 bg-background p-2">
                    <div className="space-y-1.5">
                      {voiceTranscript.map((t, i) => (
                        <p key={i} className={`text-xs ${t.role === 'user' ? 'text-foreground' : 'text-primary font-medium'}`}>
                          <span className="font-semibold">{t.role === 'user' ? 'You' : 'AI'}:</span> {t.text}
                        </p>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Calls Today</span>
              <PhoneCall className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">{sampleData ? todayCalls.length : 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Answered</span>
              <PhoneIncoming className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">{sampleData ? answeredToday : 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Messages</span>
              <Mail className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">{sampleData ? messagesCount : 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Avg Duration</span>
              <BarChart2 className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-serif font-bold text-foreground">{sampleData ? `${avgMin}:${String(avgSec).padStart(2, '0')}` : '0:00'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Calls + Unread Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Calls */}
        <Card className="lg:col-span-2 bg-card border-border/30 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg tracking-tight">Recent Calls</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80" onClick={() => setActiveScreen('history')}>
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sampleData ? (
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {todayCalls.map(call => (
                    <div key={call.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/20 hover:border-border/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <OutcomeIcon outcome={call.outcome} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{call.callerId}</p>
                          <p className="text-xs text-muted-foreground">{call.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{call.duration}</span>
                        <OutcomeBadge outcome={call.outcome} />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <PhoneCall className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No recent calls</p>
                <p className="text-xs mt-1">Calls will appear here as they come in</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unread Messages */}
        <Card className="bg-card border-border/30 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-serif text-lg tracking-tight">Unread Messages</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80" onClick={() => setActiveScreen('messages')}>
                View All <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sampleData && unreadMessages.length > 0 ? (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {unreadMessages.map(msg => (
                    <div key={msg.id} className="p-3 rounded-lg bg-background/50 border border-border/20 hover:border-border/40 transition-colors cursor-pointer" onClick={() => setActiveScreen('messages')}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-foreground">{msg.callerName}</span>
                        <UrgencyBadge urgency={msg.urgency} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{msg.time} - {msg.date}</p>
                      <p className="text-xs text-foreground/80 line-clamp-2">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">No unread messages</p>
                <p className="text-xs mt-1">Messages from callers will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ===== MESSAGES SCREEN =====
function MessagesScreen({
  messages,
  setMessages,
  sampleData,
}: {
  messages: MessageRecord[]
  setMessages: (fn: (prev: MessageRecord[]) => MessageRecord[]) => void
  sampleData: boolean
}) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<MessageRecord | null>(null)
  const [actionFeedback, setActionFeedback] = useState('')

  const filteredMessages = messages.filter(m => {
    if (filterStatus !== 'all' && m.status !== filterStatus) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return m.callerName.toLowerCase().includes(q) || m.phone.includes(q) || m.message.toLowerCase().includes(q)
    }
    return true
  })

  const handleMarkRead = (id: string) => {
    setMessages((prev: MessageRecord[]) => prev.map(m => m.id === id ? { ...m, status: 'read' } : m))
    if (selectedMessage?.id === id) {
      setSelectedMessage(prev => prev ? { ...prev, status: 'read' } : null)
    }
    setActionFeedback('Message marked as read')
    setTimeout(() => setActionFeedback(''), 3000)
  }

  const handleArchive = (id: string) => {
    setMessages((prev: MessageRecord[]) => prev.map(m => m.id === id ? { ...m, status: 'archived' } : m))
    if (selectedMessage?.id === id) {
      setSelectedMessage(null)
    }
    setActionFeedback('Message archived')
    setTimeout(() => setActionFeedback(''), 3000)
  }

  if (!sampleData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <MessageSquare className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-lg font-serif font-medium">No Messages Yet</p>
        <p className="text-sm mt-1">Enable sample data to see example messages, or messages will appear as callers leave them.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search messages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-background border-border/30" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44 bg-background border-border/30">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {actionFeedback && (
        <p className="text-xs text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" />{actionFeedback}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Messages List */}
        <div className="lg:col-span-2">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-2 pr-2">
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Filter className="w-6 h-6 mb-2 opacity-40" />
                  <p className="text-sm">No messages match your filters</p>
                </div>
              ) : (
                filteredMessages.map(msg => (
                  <Card key={msg.id} className={`cursor-pointer transition-all hover:shadow-md border-border/30 ${selectedMessage?.id === msg.id ? 'ring-2 ring-primary/30 border-primary/40' : ''} ${msg.status === 'unread' ? 'bg-card' : 'bg-card/60'}`} onClick={() => setSelectedMessage(msg)}>
                    <CardContent className="p-3.5">
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {msg.status === 'unread' && <div className="w-2 h-2 rounded-full bg-primary" />}
                          <span className={`text-sm ${msg.status === 'unread' ? 'font-semibold' : 'font-medium'} text-foreground`}>{msg.callerName}</span>
                        </div>
                        <UrgencyBadge urgency={msg.urgency} />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1.5">{msg.phone} | {msg.time} - {msg.date}</p>
                      <p className="text-xs text-foreground/70 line-clamp-2">{msg.message}</p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-3">
          {selectedMessage ? (
            <Card className="bg-card border-border/30 shadow-md h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="font-serif text-xl tracking-tight">{selectedMessage.callerName}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Phone className="w-3 h-3" />{selectedMessage.phone}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <UrgencyBadge urgency={selectedMessage.urgency} />
                    <Badge variant={selectedMessage.status === 'unread' ? 'default' : 'secondary'} className="text-xs">
                      {selectedMessage.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <Separator className="bg-border/30" />
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-3">{selectedMessage.time} on {selectedMessage.date}</p>
                <div className="bg-background/50 rounded-lg p-4 border border-border/20">
                  <p className="text-sm text-foreground leading-relaxed">{selectedMessage.message}</p>
                </div>
              </CardContent>
              <CardFooter className="gap-2 pt-0">
                {selectedMessage.status === 'unread' && (
                  <Button variant="outline" size="sm" onClick={() => handleMarkRead(selectedMessage.id)} className="border-border/30">
                    <Eye className="w-3.5 h-3.5 mr-1.5" />Mark Read
                  </Button>
                )}
                {selectedMessage.status !== 'archived' && (
                  <Button variant="outline" size="sm" onClick={() => handleArchive(selectedMessage.id)} className="border-border/30">
                    <Archive className="w-3.5 h-3.5 mr-1.5" />Archive
                  </Button>
                )}
              </CardFooter>
            </Card>
          ) : (
            <Card className="bg-card/50 border-border/20 h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground py-12">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Select a message to view details</p>
                <p className="text-xs mt-1">Choose from the list on the left</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

// ===== CALL HISTORY SCREEN =====
function CallHistoryScreen({
  calls,
  sampleData,
}: {
  calls: CallRecord[]
  sampleData: boolean
}) {
  const [filterOutcome, setFilterOutcome] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null)

  const filteredCalls = calls.filter(c => {
    if (filterOutcome !== 'all' && c.outcome !== filterOutcome) return false
    if (searchQuery) {
      return c.callerId.includes(searchQuery)
    }
    return true
  })

  const totalCalls = calls.length
  const answeredRate = totalCalls > 0 ? Math.round((calls.filter(c => c.outcome === 'Answered').length / totalCalls) * 100) : 0
  const totalSeconds = calls.reduce((sum, c) => {
    const parts = c.duration.split(':')
    return sum + (parseInt(parts[0] ?? '0', 10) * 60) + parseInt(parts[1] ?? '0', 10)
  }, 0)
  const avgSeconds = totalCalls > 0 ? Math.round(totalSeconds / totalCalls) : 0
  const avgM = Math.floor(avgSeconds / 60)
  const avgS = avgSeconds % 60

  if (!sampleData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <Clock className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-lg font-serif font-medium">No Call History</p>
        <p className="text-sm mt-1">Enable sample data to see example calls, or call records will appear as they are received.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Calls</p>
            <p className="text-2xl font-serif font-bold text-foreground">{totalCalls}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Answer Rate</p>
            <p className="text-2xl font-serif font-bold text-foreground">{answeredRate}%</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Avg Duration</p>
            <p className="text-2xl font-serif font-bold text-foreground">{avgM}:{String(avgS).padStart(2, '0')}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/30 shadow-sm">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Peak Hours</p>
            <p className="text-2xl font-serif font-bold text-foreground">9-11 AM</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by caller ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-background border-border/30" />
        </div>
        <Select value={filterOutcome} onValueChange={setFilterOutcome}>
          <SelectTrigger className="w-full sm:w-44 bg-background border-border/30">
            <SelectValue placeholder="Filter outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outcomes</SelectItem>
            <SelectItem value="Answered">Answered</SelectItem>
            <SelectItem value="Message">Message</SelectItem>
            <SelectItem value="Transferred">Transferred</SelectItem>
            <SelectItem value="Missed">Missed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Call Log Table */}
      <Card className="bg-card border-border/30 shadow-md">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="divide-y divide-border/20">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-3">Date & Time</div>
                <div className="col-span-3">Caller ID</div>
                <div className="col-span-2">Duration</div>
                <div className="col-span-2">Outcome</div>
                <div className="col-span-2 text-right">Transcript</div>
              </div>
              {filteredCalls.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <p className="text-sm">No calls match your filters</p>
                </div>
              ) : (
                filteredCalls.map(call => (
                  <div key={call.id} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/20 transition-colors items-center">
                    <div className="col-span-3">
                      <p className="text-sm text-foreground">{call.date}</p>
                      <p className="text-xs text-muted-foreground">{call.time}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-foreground">{call.callerId}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-foreground">{call.duration}</p>
                    </div>
                    <div className="col-span-2">
                      <OutcomeBadge outcome={call.outcome} />
                    </div>
                    <div className="col-span-2 text-right">
                      {call.transcript ? (
                        <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80" onClick={() => setSelectedCall(call)}>
                          <FileText className="w-3 h-3 mr-1" />View
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Transcript Modal */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedCall(null)}>
          <Card className="bg-card border-border/30 shadow-2xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-lg">Call Transcript</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCall(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription>
                {selectedCall.callerId} | {selectedCall.date} at {selectedCall.time} | Duration: {selectedCall.duration}
              </CardDescription>
            </CardHeader>
            <Separator className="bg-border/30" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <OutcomeBadge outcome={selectedCall.outcome} />
              </div>
              <div className="bg-background/50 rounded-lg p-4 border border-border/20">
                <p className="text-sm text-foreground leading-relaxed">{selectedCall.transcript || 'No transcript available for this call.'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ===== SETTINGS SCREEN =====
function SettingsScreen({ sampleData }: { sampleData: boolean }) {
  const [settingsTab, setSettingsTab] = useState('business')

  // Business Info
  const [businessName, setBusinessName] = useState(sampleData ? 'Bright Smile Dental' : '')
  const [businessHours, setBusinessHours] = useState(sampleData ? 'Mon-Fri 8:00 AM - 5:00 PM, Sat 9:00 AM - 1:00 PM' : '')
  const [businessAddress, setBusinessAddress] = useState(sampleData ? '1234 Oak Street, Suite 200, Springfield, IL 62704' : '')
  const [businessPhone, setBusinessPhone] = useState(sampleData ? '+1 (555) 100-2000' : '')
  const [businessSaved, setBusinessSaved] = useState(false)

  // Greeting
  const [greetingMessage, setGreetingMessage] = useState(sampleData ? 'Thank you for calling Bright Smile Dental! How may I assist you today? I can help you schedule appointments, answer questions about our services, or connect you with the right department.' : '')
  const [greetingTone, setGreetingTone] = useState(sampleData ? 'professional' : 'professional')
  const [greetingSaved, setGreetingSaved] = useState(false)

  // FAQ
  const [faqs, setFaqs] = useState<FAQEntry[]>(sampleData ? DEFAULT_FAQS : [])
  const [newQuestion, setNewQuestion] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [faqFeedback, setFaqFeedback] = useState('')

  // Knowledge Base
  const { documents, loading: kbLoading, error: kbError, fetchDocuments, uploadDocument, removeDocuments } = useRAGKnowledgeBase()
  const [uploadFeedback, setUploadFeedback] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Departments
  const [departments, setDepartments] = useState<Department[]>(sampleData ? DEFAULT_DEPARTMENTS : [])
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptExt, setNewDeptExt] = useState('')
  const [newDeptInstr, setNewDeptInstr] = useState('')
  const [deptFeedback, setDeptFeedback] = useState('')

  useEffect(() => {
    fetchDocuments(RAG_ID)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setUploadFeedback('')
    const result = await uploadDocument(RAG_ID, file)
    if (result.success) {
      setUploadFeedback(`"${file.name}" uploaded and training started.`)
    } else {
      setUploadFeedback(`Upload failed: ${result.error ?? 'Unknown error'}`)
    }
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setTimeout(() => setUploadFeedback(''), 5000)
  }

  const handleDeleteDoc = async (fileName: string) => {
    const result = await removeDocuments(RAG_ID, [fileName])
    if (result.success) {
      setUploadFeedback(`"${fileName}" deleted successfully.`)
    } else {
      setUploadFeedback(`Delete failed: ${result.error ?? 'Unknown error'}`)
    }
    setTimeout(() => setUploadFeedback(''), 5000)
  }

  const handleAddFaq = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return
    const newEntry: FAQEntry = {
      id: String(faqs.length + 1),
      question: newQuestion.trim(),
      answer: newAnswer.trim(),
    }
    setFaqs(prev => [...prev, newEntry])
    setNewQuestion('')
    setNewAnswer('')
    setFaqFeedback('FAQ entry added successfully')
    setTimeout(() => setFaqFeedback(''), 3000)
  }

  const handleDeleteFaq = (id: string) => {
    setFaqs(prev => prev.filter(f => f.id !== id))
    setFaqFeedback('FAQ entry removed')
    setTimeout(() => setFaqFeedback(''), 3000)
  }

  const handleAddDept = () => {
    if (!newDeptName.trim() || !newDeptExt.trim()) return
    const newDept: Department = {
      id: String(departments.length + 1),
      name: newDeptName.trim(),
      extension: newDeptExt.trim(),
      instructions: newDeptInstr.trim(),
    }
    setDepartments(prev => [...prev, newDept])
    setNewDeptName('')
    setNewDeptExt('')
    setNewDeptInstr('')
    setDeptFeedback('Department added successfully')
    setTimeout(() => setDeptFeedback(''), 3000)
  }

  const handleDeleteDept = (id: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id))
    setDeptFeedback('Department removed')
    setTimeout(() => setDeptFeedback(''), 3000)
  }

  return (
    <div className="space-y-4">
      <Tabs value={settingsTab} onValueChange={setSettingsTab}>
        <TabsList className="bg-muted/50 border border-border/20">
          <TabsTrigger value="business" className="text-sm">Business Info</TabsTrigger>
          <TabsTrigger value="greeting" className="text-sm">Greeting</TabsTrigger>
          <TabsTrigger value="knowledge" className="text-sm">Knowledge</TabsTrigger>
          <TabsTrigger value="routing" className="text-sm">Routing</TabsTrigger>
        </TabsList>

        {/* Business Info Tab */}
        <TabsContent value="business" className="mt-4">
          <Card className="bg-card border-border/30 shadow-md">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Business Information</CardTitle>
              <CardDescription>Configure your business details for the receptionist</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="biz-name" className="text-sm font-medium">Business Name</Label>
                <Input id="biz-name" value={businessName} onChange={(e) => { setBusinessName(e.target.value); setBusinessSaved(false) }} placeholder="Enter business name" className="bg-background border-border/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-phone" className="text-sm font-medium">Phone Number</Label>
                <Input id="biz-phone" value={businessPhone} onChange={(e) => { setBusinessPhone(e.target.value); setBusinessSaved(false) }} placeholder="Enter phone number" className="bg-background border-border/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-hours" className="text-sm font-medium">Hours of Operation</Label>
                <Input id="biz-hours" value={businessHours} onChange={(e) => { setBusinessHours(e.target.value); setBusinessSaved(false) }} placeholder="e.g., Mon-Fri 9am-5pm" className="bg-background border-border/30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="biz-addr" className="text-sm font-medium">Address</Label>
                <Textarea id="biz-addr" value={businessAddress} onChange={(e) => { setBusinessAddress(e.target.value); setBusinessSaved(false) }} placeholder="Enter business address" className="bg-background border-border/30 resize-none" rows={2} />
              </div>
            </CardContent>
            <CardFooter className="flex items-center gap-3">
              <Button onClick={() => { setBusinessSaved(true); setTimeout(() => setBusinessSaved(false), 3000) }} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Changes
              </Button>
              {businessSaved && <span className="text-xs text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" />Saved successfully</span>}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Greeting Tab */}
        <TabsContent value="greeting" className="mt-4">
          <Card className="bg-card border-border/30 shadow-md">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Greeting Configuration</CardTitle>
              <CardDescription>Customize how the receptionist greets callers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="greeting-msg" className="text-sm font-medium">Greeting Message</Label>
                <Textarea id="greeting-msg" value={greetingMessage} onChange={(e) => { setGreetingMessage(e.target.value); setGreetingSaved(false) }} placeholder="Enter the greeting message for callers..." className="bg-background border-border/30 resize-none" rows={4} />
                <p className="text-xs text-muted-foreground">{greetingMessage.length}/500 characters</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tone</Label>
                <Select value={greetingTone} onValueChange={(v) => { setGreetingTone(v); setGreetingSaved(false) }}>
                  <SelectTrigger className="bg-background border-border/30 w-full sm:w-60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly & Warm</SelectItem>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex items-center gap-3">
              <Button onClick={() => { setGreetingSaved(true); setTimeout(() => setGreetingSaved(false), 3000) }} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Greeting
              </Button>
              {greetingSaved && <span className="text-xs text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" />Greeting saved</span>}
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Knowledge Tab */}
        <TabsContent value="knowledge" className="mt-4">
          <div className="space-y-6">
            {/* FAQ Management */}
            <Card className="bg-card border-border/30 shadow-md">
              <CardHeader>
                <CardTitle className="font-serif text-lg">FAQ Entries</CardTitle>
                <CardDescription>Common questions and answers the receptionist can reference</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {faqFeedback && (
                  <p className="text-xs text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" />{faqFeedback}</p>
                )}
                <ScrollArea className="max-h-64">
                  <div className="space-y-3">
                    {faqs.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No FAQ entries yet. Add your first one below.</p>
                    ) : (
                      faqs.map(faq => (
                        <div key={faq.id} className="p-3 rounded-lg bg-background/50 border border-border/20">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 mr-2">
                              <p className="text-sm font-semibold text-foreground mb-1">{faq.question}</p>
                              <p className="text-xs text-muted-foreground">{faq.answer}</p>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteFaq(faq.id)} className="text-destructive hover:text-destructive/80 shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                <Separator className="bg-border/30" />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">Add New FAQ</p>
                  <Input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Question" className="bg-background border-border/30" />
                  <Textarea value={newAnswer} onChange={(e) => setNewAnswer(e.target.value)} placeholder="Answer" className="bg-background border-border/30 resize-none" rows={2} />
                  <Button onClick={handleAddFaq} disabled={!newQuestion.trim() || !newAnswer.trim()} variant="outline" size="sm" className="border-border/30">
                    <Plus className="w-3.5 h-3.5 mr-1.5" />Add Entry
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Document Upload */}
            <Card className="bg-card border-border/30 shadow-md">
              <CardHeader>
                <CardTitle className="font-serif text-lg">Knowledge Base Documents</CardTitle>
                <CardDescription>Upload documents (PDF, DOCX, TXT) to train the receptionist</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {uploadFeedback && (
                  <p className={`text-xs flex items-center gap-1 ${uploadFeedback.startsWith('Upload failed') || uploadFeedback.startsWith('Delete failed') ? 'text-destructive' : 'text-emerald-700'}`}>
                    {uploadFeedback.startsWith('Upload failed') || uploadFeedback.startsWith('Delete failed') ? <AlertCircle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                    {uploadFeedback}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" id="kb-upload" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading || kbLoading} className="border-border/30">
                    {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                    {isUploading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                  <span className="text-xs text-muted-foreground">PDF, DOCX, TXT supported</span>
                </div>
                {kbError && (
                  <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{kbError}</p>
                )}
                {kbLoading && !isUploading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Loading documents...</div>
                )}
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {Array.isArray(documents) && documents.length > 0 ? (
                      documents.map((doc, i) => (
                        <div key={doc?.id ?? i} className="flex items-center justify-between p-2.5 rounded-lg bg-background/50 border border-border/20">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            <div>
                              <p className="text-sm font-medium text-foreground">{doc?.fileName ?? 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc?.fileType ?? 'file'} {doc?.status ? `| ${doc.status}` : ''}
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => doc?.fileName && handleDeleteDoc(doc.fileName)} className="text-destructive hover:text-destructive/80">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      !kbLoading && (
                        <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet.</p>
                      )
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Routing Tab */}
        <TabsContent value="routing" className="mt-4">
          <Card className="bg-card border-border/30 shadow-md">
            <CardHeader>
              <CardTitle className="font-serif text-lg">Call Routing & Departments</CardTitle>
              <CardDescription>Configure departments and transfer instructions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {deptFeedback && (
                <p className="text-xs text-emerald-700 flex items-center gap-1"><Check className="w-3 h-3" />{deptFeedback}</p>
              )}
              <ScrollArea className="max-h-64">
                <div className="space-y-3">
                  {departments.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No departments configured. Add your first one below.</p>
                  ) : (
                    departments.map(dept => (
                      <div key={dept.id} className="p-3 rounded-lg bg-background/50 border border-border/20">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-foreground">{dept.name}</span>
                              <Badge variant="secondary" className="text-xs">Ext. {dept.extension}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{dept.instructions}</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => handleDeleteDept(dept.id)} className="text-destructive hover:text-destructive/80 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <Separator className="bg-border/30" />
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Add New Department</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Department name" className="bg-background border-border/30" />
                  <Input value={newDeptExt} onChange={(e) => setNewDeptExt(e.target.value)} placeholder="Extension (e.g., 201)" className="bg-background border-border/30" />
                </div>
                <Textarea value={newDeptInstr} onChange={(e) => setNewDeptInstr(e.target.value)} placeholder="Transfer instructions..." className="bg-background border-border/30 resize-none" rows={2} />
                <Button onClick={handleAddDept} disabled={!newDeptName.trim() || !newDeptExt.trim()} variant="outline" size="sm" className="border-border/30">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />Add Department
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ===== MAIN HOME COMPONENT =====
export default function Home() {
  const [activeScreen, setActiveScreen] = useState('dashboard')
  const [sampleData, setSampleData] = useState(false)
  const [receptionistActive, setReceptionistActive] = useState(true)
  const [messages, setMessages] = useState<MessageRecord[]>(MOCK_MESSAGES)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Voice session state
  const [isVoiceActive, setIsVoiceActive] = useState(false)
  const [isVoiceConnecting, setIsVoiceConnecting] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState<TranscriptEntry[]>([])
  const [isThinking, setIsThinking] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)

  // Audio playback queue
  const audioQueueRef = useRef<string[]>([])
  const isPlayingRef = useRef(false)
  const playbackCtxRef = useRef<AudioContext | null>(null)
  const sampleRateRef = useRef(24000)

  const playNextInQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return
    isPlayingRef.current = true
    const base64Audio = audioQueueRef.current.shift()
    if (!base64Audio) {
      isPlayingRef.current = false
      return
    }
    try {
      const binaryString = atob(base64Audio)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const pcm16 = new Int16Array(bytes.buffer)
      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768
      }
      if (!playbackCtxRef.current || playbackCtxRef.current.state === 'closed') {
        playbackCtxRef.current = new AudioContext({ sampleRate: sampleRateRef.current })
      }
      const ctx = playbackCtxRef.current
      const buffer = ctx.createBuffer(1, float32.length, sampleRateRef.current)
      buffer.getChannelData(0).set(float32)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.onended = () => {
        isPlayingRef.current = false
        playNextInQueue()
      }
      source.start()
    } catch {
      isPlayingRef.current = false
      playNextInQueue()
    }
  }, [])

  const startVoiceSession = useCallback(async () => {
    setIsVoiceConnecting(true)
    setVoiceError('')
    setVoiceTranscript([])
    setIsThinking(false)
    audioQueueRef.current = []
    isPlayingRef.current = false

    try {
      const res = await fetch('https://voice-sip.studio.lyzr.ai/session/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: VOICE_AGENT_ID }),
      })
      if (!res.ok) {
        throw new Error(`Session start failed: ${res.status}`)
      }
      const data = await res.json()
      const wsUrl = data?.wsUrl
      const sr = data?.audioConfig?.sampleRate ?? 24000
      sampleRateRef.current = sr

      if (!wsUrl) {
        throw new Error('No WebSocket URL returned from session start')
      }

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          streamRef.current = stream
          const audioContext = new AudioContext({ sampleRate: sr })
          audioContextRef.current = audioContext
          const source = audioContext.createMediaStreamSource(stream)
          const processor = audioContext.createScriptProcessor(4096, 1, 1)
          processorRef.current = processor

          source.connect(processor)
          processor.connect(audioContext.destination)

          processor.onaudioprocess = (e) => {
            if (ws.readyState !== WebSocket.OPEN) return
            const inputData = e.inputBuffer.getChannelData(0)
            const pcm16 = new Int16Array(inputData.length)
            for (let i = 0; i < inputData.length; i++) {
              pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)))
            }
            const uint8 = new Uint8Array(pcm16.buffer)
            let binary = ''
            const chunkSize = 8192
            for (let offset = 0; offset < uint8.length; offset += chunkSize) {
              const slice = uint8.subarray(offset, Math.min(offset + chunkSize, uint8.length))
              binary += String.fromCharCode(...slice)
            }
            const base64 = btoa(binary)
            ws.send(JSON.stringify({
              type: 'audio',
              audio: base64,
              sampleRate: sr,
            }))
          }

          setIsVoiceActive(true)
          setIsVoiceConnecting(false)
        } catch (micErr) {
          setVoiceError('Microphone access denied. Please allow microphone access and try again.')
          setIsVoiceConnecting(false)
          ws.close()
        }
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'audio' && msg.audio) {
            audioQueueRef.current.push(msg.audio)
            playNextInQueue()
          } else if (msg.type === 'transcript') {
            setVoiceTranscript(prev => [...prev, {
              role: msg.role ?? (msg.is_final ? 'user' : 'assistant'),
              text: msg.text ?? msg.transcript ?? '',
            }])
            setIsThinking(false)
          } else if (msg.type === 'thinking') {
            setIsThinking(true)
          } else if (msg.type === 'clear') {
            setIsThinking(false)
          } else if (msg.type === 'error') {
            setVoiceError(msg.message ?? 'An error occurred during the voice session')
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onerror = () => {
        setVoiceError('Voice connection error. Please try again.')
        setIsVoiceConnecting(false)
      }

      ws.onclose = () => {
        setIsVoiceActive(false)
        setIsVoiceConnecting(false)
      }
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : 'Failed to start voice session')
      setIsVoiceConnecting(false)
    }
  }, [playNextInQueue])

  const endVoiceSession = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (playbackCtxRef.current && playbackCtxRef.current.state !== 'closed') {
      playbackCtxRef.current.close()
      playbackCtxRef.current = null
    }
    audioQueueRef.current = []
    isPlayingRef.current = false
    setIsVoiceActive(false)
    setIsVoiceConnecting(false)
    setIsThinking(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endVoiceSession()
    }
  }, [endVoiceSession])

  const screenTitle: Record<string, string> = {
    dashboard: 'Dashboard',
    messages: 'Messages',
    history: 'Call History',
    settings: 'Settings',
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-60'} bg-card border-r border-border/20 flex flex-col transition-all duration-300 shrink-0`}>
        {/* Logo */}
        <div className={`p-4 border-b border-border/20 ${sidebarCollapsed ? 'px-3' : ''}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <h1 className="text-sm font-serif font-bold text-foreground tracking-tight leading-tight">Voice AI</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Receptionist</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = activeScreen === item.id
            const Icon = item.icon
            return (
              <button key={item.id} onClick={() => setActiveScreen(item.id)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}>
                <Icon className="w-4.5 h-4.5 shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Agent Info */}
        {!sidebarCollapsed && (
          <div className="p-3 mx-2 mb-3 rounded-lg bg-muted/30 border border-border/20">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Agent</p>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-foreground truncate">Voice Receptionist</span>
            </div>
            <p className="text-[10px] text-muted-foreground truncate">ID: {VOICE_AGENT_ID.slice(0, 12)}...</p>
          </div>
        )}

        {/* Collapse Toggle */}
        <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-3 border-t border-border/20 text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className={`w-4 h-4 mx-auto transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 border-b border-border/20 bg-card/50 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-serif font-semibold text-foreground tracking-tight">{screenTitle[activeScreen] ?? 'Dashboard'}</h2>
            {activeScreen === 'dashboard' && (
              <div className="flex items-center gap-1.5 ml-2">
                <div className={`w-2 h-2 rounded-full ${receptionistActive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
                <span className="text-xs text-muted-foreground">{receptionistActive ? 'Online' : 'Offline'}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground">Sample Data</Label>
            <Switch id="sample-toggle" checked={sampleData} onCheckedChange={setSampleData} />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeScreen === 'dashboard' && (
            <DashboardScreen
              receptionistActive={receptionistActive}
              setReceptionistActive={setReceptionistActive}
              calls={MOCK_CALLS}
              messages={messages}
              setActiveScreen={setActiveScreen}
              onStartVoice={startVoiceSession}
              isVoiceActive={isVoiceActive}
              isVoiceConnecting={isVoiceConnecting}
              voiceTranscript={voiceTranscript}
              isThinking={isThinking}
              voiceError={voiceError}
              onEndVoice={endVoiceSession}
              sampleData={sampleData}
            />
          )}
          {activeScreen === 'messages' && (
            <MessagesScreen messages={sampleData ? messages : []} setMessages={setMessages} sampleData={sampleData} />
          )}
          {activeScreen === 'history' && (
            <CallHistoryScreen calls={sampleData ? MOCK_CALLS : []} sampleData={sampleData} />
          )}
          {activeScreen === 'settings' && (
            <SettingsScreen sampleData={sampleData} />
          )}
        </div>
      </main>
    </div>
  )
}
