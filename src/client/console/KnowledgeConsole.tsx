// src/client/console/KnowledgeConsole.tsx
// -----------------------------------------------------------------------------
// Knowledge Hub console — moved OUT of @neomodul/crm and extended (see
// src/server/collections.ts "Knowledge Hub" section + plugin.ts's
// knowledgeSearch/knowledgeSuggest/knowledgeSuggestionApprove/Reject actions).
//
// This is its OWN top-level console — COMPLETELY SEPARATE from NeoaiConsole's
// sidebar/shell (same relationship CRM's KnowledgeConsolePage had to CRM's
// Sales/Projects console). It renders its own brand sidebar (NEOHOME_THEME,
// same look as NeoaiConsolePage) with four tabs:
//
//   * Articles     — CRUD over neoai_knowledge_articles, PLUS a "Linked items"
//                    section per article (neoai_knowledge_links: cross-entity
//                    references like catalog options, CRM deals, …).
//   * AI Prompts   — CRUD over neoai_prompts (same shape as CRM's ai_prompts).
//   * Suggestions  — THE review queue: neoai_knowledge_suggestions, approve
//                    (writes the article) / reject (never touches the
//                    article), via antd Modal.confirm (never window.confirm —
//                    banned in this project, freezes the whole CDP tab).
//   * Retrieval test — calls neoai:knowledgeSearch, same UI shape as CRM's.
//
// Human-gated by construction: AI/workflow code can only ever create a
// Suggestions row (status:'pending'); this console is the only place a
// pending suggestion becomes (or doesn't become) a live article.
//
// Route wiring lives in src/client/index.tsx — every tab below needs its OWN
// registered admin.* AND standalone route (this plugin already shipped one
// live-404 regression, commit 2feba37, from forgetting that step once).

import React, { useEffect, useState } from 'react';
import { ConfigProvider, Button, Card, Checkbox, Empty, Form, Input, InputNumber, Popconfirm, Select, Space, Spin, Switch, Table, Tag, Typography, message, Modal } from 'antd';
import { Icon, useAPIClient } from '@nocobase/client';
import { NEOHOME_GREEN, NEOHOME_THEME, ensureInterFont } from '../theme';
import { NEOMODUL_FAVICON_SRC } from '../logo';
import {
  ConsoleAccessGate,
  ConsoleDrawer,
  createResource,
  fmtTime,
  listResource,
  neoaiAction,
  updateResource,
  usePoll,
} from './shared';

const TABS: Array<{ key: string; label: string; icon: string }> = [
  { key: 'articles', label: 'Articles', icon: 'FileTextOutlined' },
  { key: 'prompts', label: 'AI Prompts', icon: 'RobotOutlined' },
  { key: 'suggestions', label: 'Suggestions', icon: 'CheckSquareOutlined' },
  { key: 'retrieval', label: 'Retrieval test', icon: 'ExperimentOutlined' },
];

// Sensible defaults offered in the UI — use_case is now a free string (spans
// multiple plugins), so this is a starting-point list, not a closed enum.
const USE_CASE_SUGGESTIONS = [
  'general',
  'whatsapp-reply',
  'email-draft',
  'lead-qualification',
  'project-coordination',
  'konfigurator.catalog-assist',
];

function activeTabFromPath(pathname: string): string {
  const m = pathname.match(/neoai-knowledge\/?([a-z]*)/i);
  const key = (m?.[1] ?? '').toLowerCase();
  return TABS.some((t) => t.key === key) ? key : 'articles';
}

function SideItem(props: { icon: string; label: string; active?: boolean; onClick: () => void; muted?: boolean }) {
  return (
    <div
      onClick={props.onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 9,
        cursor: 'pointer',
        fontWeight: props.active ? 600 : 500,
        color: props.active ? NEOHOME_GREEN : props.muted ? '#8a8f8a' : '#3c4043',
        background: props.active ? '#eaf7ea' : 'transparent',
        fontSize: 13.5,
        userSelect: 'none',
      }}
    >
      <Icon type={props.icon as any} />
      <span>{props.label}</span>
    </div>
  );
}

// ---- section 1: Articles (+ Linked items) --------------------------------------

function LinkedItemsSection({ articleId }: { articleId: number }) {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { rows } = await listResource(api, 'neoai_knowledge_links', {
        filter: JSON.stringify({ article_id: articleId }),
        sort: '-id',
        pageSize: 200,
      });
      setRows(rows);
    } catch (err: any) {
      message.error(`Load failed: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId]);

  const addLink = async () => {
    if (!entityType.trim() || !entityId.trim()) {
      message.error('Entity type and entity id are required');
      return;
    }
    setSaving(true);
    try {
      await createResource(api, 'neoai_knowledge_links', {
        article_id: articleId,
        entity_type: entityType.trim(),
        entity_id: entityId.trim(),
        label: label.trim(),
      });
      setEntityType('');
      setEntityId('');
      setLabel('');
      await load();
      message.success('Link added');
    } catch (err: any) {
      message.error(err?.message || 'Failed to add link');
    } finally {
      setSaving(false);
    }
  };

  const removeLink = async (id: number) => {
    await api.resource('neoai_knowledge_links').destroy({ filterByTk: id });
    await load();
  };

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', color: '#8a8f8a', margin: '0 0 8px' }}>
        LINKED ITEMS — cross-entity references (catalog options, CRM deals, …)
      </div>
      <Spin spinning={loading}>
        {rows.length ? (
          <Space direction="vertical" size={6} style={{ width: '100%', marginBottom: 12 }}>
            {rows.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 10px',
                  background: '#fafaf8',
                  border: '1px solid #ececea',
                  borderRadius: 8,
                }}
              >
                <Typography.Text code style={{ fontSize: 12 }}>
                  {r.entity_type}
                </Typography.Text>
                <Typography.Text code style={{ fontSize: 12 }}>
                  {r.entity_id}
                </Typography.Text>
                {r.label ? <Typography.Text style={{ fontSize: 12.5, color: '#5c605c' }}>{r.label}</Typography.Text> : null}
                <div style={{ flex: 1 }} />
                <Button size="small" danger onClick={() => removeLink(r.id)}>
                  Remove
                </Button>
              </div>
            ))}
          </Space>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No linked items yet" style={{ padding: 12 }} />
        )}
      </Spin>
      <Space size={8} wrap>
        <Input placeholder='Entity type (e.g. "konfigurator.catalog_option")' value={entityType} onChange={(e) => setEntityType(e.target.value)} style={{ width: 260 }} />
        <Input placeholder="Entity id" value={entityId} onChange={(e) => setEntityId(e.target.value)} style={{ width: 140 }} />
        <Input placeholder="Label (optional)" value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: 200 }} />
        <Button type="primary" loading={saving} onClick={addLink}>
          Add link
        </Button>
      </Space>
    </div>
  );
}

type EditorState = { record: any | null } | null;

function ArticleEditorDrawer(props: { editor: EditorState; onClose: () => void; onMutated: () => void }) {
  const { editor, onClose, onMutated } = props;
  const api = useAPIClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const open = !!editor;
  const record = editor?.record ?? null;

  const done = (msg: string) => {
    message.success(msg);
    onMutated();
    onClose();
  };

  const onFinish = async (raw: any) => {
    setSaving(true);
    try {
      const values = {
        title: String(raw.title || '').trim(),
        use_case: String(raw.use_case || '').trim(),
        language: raw.language || 'en',
        tags: String(raw.tags || '').trim(),
        body: raw.body ?? '',
        active: !!raw.active,
      };
      if (record?.id != null) {
        await updateResource(api, 'neoai_knowledge_articles', record.id, values);
        done('Article updated');
      } else {
        await createResource(api, 'neoai_knowledge_articles', { ...values, source: 'manual' });
        done('Article created');
      }
    } catch (e: any) {
      message.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (record?.id == null) return;
    setDeleting(true);
    try {
      await api.resource('neoai_knowledge_articles').destroy({ filterByTk: record.id });
      done('Article deleted');
    } catch (e: any) {
      message.error(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ConsoleDrawer open={open} onClose={onClose} title={record ? String(record.title || `Article #${record.id}`) : 'New article'}>
      {open ? (
        <div style={{ padding: 18, maxWidth: 900 }}>
          <Form
            key={record?.id ?? 'new'}
            layout="vertical"
            initialValues={{ use_case: 'general', language: 'en', active: true, ...(record || {}) }}
            onFinish={onFinish}
          >
            {record ? (
              <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
                Created {fmtTime(record.createdAt)} · Updated {fmtTime(record.updatedAt)} · Source: <Tag>{record.source || 'manual'}</Tag>
              </Typography.Paragraph>
            ) : null}
            <Form.Item name="title" label="Title" rules={[{ required: true, whitespace: true, message: 'Title is required' }]}>
              <Input placeholder="Article title" />
            </Form.Item>
            <Form.Item name="use_case" label="Use case" extra="Free text — spans multiple plugins' use cases (CRM, Konfigurator, …). Suggestions below.">
              <Select
                mode="tags"
                maxCount={1}
                options={USE_CASE_SUGGESTIONS.map((v) => ({ value: v, label: v }))}
                placeholder="general"
              />
            </Form.Item>
            <Form.Item name="language" label="Language">
              <Select options={[{ value: 'en', label: 'English' }, { value: 'de', label: 'German' }, { value: 'pl', label: 'Polish' }]} />
            </Form.Item>
            <Form.Item name="tags" label="Tags (comma-separated)">
              <Input placeholder="plot, financing, timeline" />
            </Form.Item>
            <Form.Item name="body" label="Body">
              <Input.TextArea rows={12} placeholder="Article body…" />
            </Form.Item>
            <Form.Item name="active" label="Active" valuePropName="checked" extra="Inactive articles stay editable but are invisible to retrieval.">
              <Switch />
            </Form.Item>
            <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {record ? 'Save' : 'Create'}
                </Button>
                {record ? (
                  <Popconfirm title="Delete this article?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={onDelete}>
                    <Button danger loading={deleting}>
                      Delete
                    </Button>
                  </Popconfirm>
                ) : null}
                <Button onClick={onClose} disabled={saving || deleting}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
          {record?.id != null ? <LinkedItemsSection articleId={record.id} /> : null}
        </div>
      ) : null}
    </ConsoleDrawer>
  );
}

function ArticlesPanel() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<EditorState>(null);

  const load = async () => {
    setLoading(true);
    try {
      const q = query.trim();
      const { rows } = await listResource(api, 'neoai_knowledge_articles', {
        sort: '-updatedAt',
        pageSize: 200,
        ...(q ? { filter: JSON.stringify({ title: { $includes: q } }) } : {}),
      });
      setRows(rows);
    } catch (err: any) {
      message.error(`Load failed: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };
  usePoll(load, 30_000, editor == null);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const columns = [
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true, render: (v: any) => <a>{v || '(untitled)'}</a> },
    { title: 'Use case', dataIndex: 'use_case', key: 'use_case', width: 190, render: (v: any) => (v ? <Tag>{v}</Tag> : '—') },
    { title: 'Language', dataIndex: 'language', key: 'language', width: 90 },
    { title: 'Tags', dataIndex: 'tags', key: 'tags', ellipsis: true, render: (v: any) => v || '—' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 80, align: 'center' as const, render: (v: any) => (v ? '✓' : '—') },
    { title: 'Source', dataIndex: 'source', key: 'source', width: 120, render: (v: any) => <Tag color={v === 'ai-suggested' ? 'gold' : v === 'crm-migration' ? 'blue' : 'default'}>{v || 'manual'}</Tag> },
    { title: 'Updated', dataIndex: 'updatedAt', key: 'updatedAt', width: 150, render: (v: any) => fmtTime(v) },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size={12}>
        <Input.Search
          allowClear
          placeholder="Search by title…"
          style={{ width: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={setQuery}
        />
        <Button type="primary" onClick={() => setEditor({ record: null })}>
          New article
        </Button>
        <Button onClick={load} loading={loading}>
          Refresh
        </Button>
        <Typography.Text type="secondary">{rows.length} article(s)</Typography.Text>
      </Space>
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={rows}
        columns={columns as any}
        pagination={{ pageSize: 20 }}
        onRow={(record: any) => ({ onClick: () => setEditor({ record }), style: { cursor: 'pointer' } })}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No articles yet" /> }}
      />
      <ArticleEditorDrawer editor={editor} onClose={() => setEditor(null)} onMutated={load} />
    </div>
  );
}

// ---- section 2: AI Prompts -------------------------------------------------------

function PromptEditorDrawer(props: { editor: EditorState; onClose: () => void; onMutated: () => void }) {
  const { editor, onClose, onMutated } = props;
  const api = useAPIClient();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const open = !!editor;
  const record = editor?.record ?? null;

  const done = (msg: string) => {
    message.success(msg);
    onMutated();
    onClose();
  };

  const onFinish = async (raw: any) => {
    setSaving(true);
    try {
      // `settings` (generation JSON) is deliberately OMITTED from this save —
      // same gotcha CRM's PromptsSection documents: update() only patches the
      // fields we send, so an admin's JSON edit (done in the Admin UI) survives
      // every save made from THIS form.
      const values = {
        use_case: String(raw.use_case || '').trim(),
        title: String(raw.title || '').trim(),
        system_prompt: raw.system_prompt ?? '',
        model_hint: String(raw.model_hint || '').trim(),
        active: !!raw.active,
        notes: raw.notes ?? '',
      };
      if (record?.id != null) {
        await updateResource(api, 'neoai_prompts', record.id, values);
        done('Prompt updated');
      } else {
        await createResource(api, 'neoai_prompts', values);
        done('Prompt created');
      }
    } catch (e: any) {
      message.error(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (record?.id == null) return;
    setDeleting(true);
    try {
      await api.resource('neoai_prompts').destroy({ filterByTk: record.id });
      done('Prompt deleted');
    } catch (e: any) {
      message.error(e?.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const MONO = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace';

  return (
    <ConsoleDrawer open={open} onClose={onClose} title={record ? String(record.title || record.use_case || `Prompt #${record.id}`) : 'New prompt'}>
      {open ? (
        <div style={{ padding: 18, maxWidth: 900 }}>
          <Form key={record?.id ?? 'new'} layout="vertical" initialValues={{ active: true, ...(record || {}) }} onFinish={onFinish}>
            <Form.Item name="use_case" label="Use case key" rules={[{ required: true, whitespace: true, message: 'Use case key is required' }]} extra="Lookup key — e.g. crm.leadQualification consumers resolve prompts by this exact key.">
              <Input placeholder="e.g. lead-qualification" />
            </Form.Item>
            <Form.Item name="title" label="Title">
              <Input placeholder="Prompt title" />
            </Form.Item>
            <Form.Item name="system_prompt" label="System prompt">
              <Input.TextArea rows={14} style={{ fontFamily: MONO, fontSize: 12 }} placeholder="System prompt text…" />
            </Form.Item>
            <Form.Item name="model_hint" label="Model hint" extra="Advisory only — the actual model comes from plugin-ai's LLM service configuration.">
              <Input placeholder="e.g. gemini-2.5-flash" />
            </Form.Item>
            <Form.Item name="active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item name="notes" label="Notes">
              <Input.TextArea rows={3} />
            </Form.Item>
            <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>
                  {record ? 'Save' : 'Create'}
                </Button>
                {record ? (
                  <Popconfirm title="Delete this prompt?" okText="Delete" okButtonProps={{ danger: true }} onConfirm={onDelete}>
                    <Button danger loading={deleting}>
                      Delete
                    </Button>
                  </Popconfirm>
                ) : null}
                <Button onClick={onClose} disabled={saving || deleting}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      ) : null}
    </ConsoleDrawer>
  );
}

function PromptsPanel() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<EditorState>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { rows } = await listResource(api, 'neoai_prompts', { sort: '-updatedAt', pageSize: 200 });
      setRows(rows);
    } catch (err: any) {
      message.error(`Load failed: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };
  usePoll(load, 30_000, editor == null);

  const columns = [
    { title: 'Use case key', dataIndex: 'use_case', key: 'use_case', width: 220, render: (v: any) => <Typography.Text code>{v}</Typography.Text> },
    { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true },
    { title: 'Model hint', dataIndex: 'model_hint', key: 'model_hint', ellipsis: true, render: (v: any) => v || '—' },
    { title: 'Active', dataIndex: 'active', key: 'active', width: 80, align: 'center' as const, render: (v: any) => (v ? '✓' : '—') },
    { title: 'Updated', dataIndex: 'updatedAt', key: 'updatedAt', width: 150, render: (v: any) => fmtTime(v) },
  ];

  return (
    <div style={{ padding: 20 }}>
      <Space style={{ marginBottom: 16, flexWrap: 'wrap' }} size={12}>
        <Button type="primary" onClick={() => setEditor({ record: null })}>
          New prompt
        </Button>
        <Button onClick={load} loading={loading}>
          Refresh
        </Button>
        <Typography.Text type="secondary">{rows.length} prompt(s)</Typography.Text>
      </Space>
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={rows}
        columns={columns as any}
        pagination={{ pageSize: 20 }}
        onRow={(record: any) => ({ onClick: () => setEditor({ record }), style: { cursor: 'pointer' } })}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No prompts yet" /> }}
      />
      <PromptEditorDrawer editor={editor} onClose={() => setEditor(null)} onMutated={load} />
    </div>
  );
}

// ---- section 3: Suggestions (the review queue) -----------------------------------

function SuggestionsPanel() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { rows } = await listResource(api, 'neoai_knowledge_suggestions', {
        sort: '-id',
        pageSize: 200,
        appends: ['target_article', 'source_run'],
        ...(showAll ? {} : { filter: JSON.stringify({ status: 'pending' }) }),
      });
      setRows(rows);
    } catch (err: any) {
      message.error(`Load failed: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };
  usePoll(load, 15_000, busyId == null);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAll]);

  const approve = (row: any) => {
    Modal.confirm({
      title: row.target_article ? `Approve edit to "${row.target_article.title}"?` : 'Approve new article?',
      icon: null,
      width: 560,
      okText: 'Approve',
      cancelText: 'Cancel',
      content: (
        <div style={{ fontSize: 13 }}>
          <p style={{ marginBottom: 8 }}>
            <b>Proposed title:</b> {row.proposed_title || '—'}
          </p>
          <p style={{ marginBottom: 8, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}>
            <b>Proposed body:</b>
            <br />
            {row.proposed_body || '—'}
          </p>
          <p style={{ marginBottom: 0, color: '#8a8f8a' }}>
            {row.target_article ? 'This will overwrite the target article with the proposed fields.' : 'This will create a brand-new article (source: ai-suggested).'}
          </p>
        </div>
      ),
      onOk: async () => {
        setBusyId(row.id);
        try {
          const res = await neoaiAction(api, 'knowledgeSuggestionApprove', { id: row.id });
          if (res?.ok) {
            message.success('Suggestion approved');
            await load();
          } else {
            message.error(res?.reason || 'Approve failed');
          }
        } catch (err: any) {
          message.error(String(err?.message ?? err));
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const reject = (row: any) => {
    Modal.confirm({
      title: 'Reject this suggestion?',
      icon: null,
      okText: 'Reject',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      content: 'The article stays exactly as it is — nothing is written except this suggestion\'s own status.',
      onOk: async () => {
        setBusyId(row.id);
        try {
          const res = await neoaiAction(api, 'knowledgeSuggestionReject', { id: row.id });
          if (res?.ok) {
            message.success('Suggestion rejected');
            await load();
          } else {
            message.error(res?.reason || 'Reject failed');
          }
        } catch (err: any) {
          message.error(String(err?.message ?? err));
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Target',
      key: 'target',
      width: 220,
      render: (_: any, r: any) => (r.target_article ? <Typography.Text>{r.target_article.title}</Typography.Text> : <Tag color="gold">New article</Tag>),
    },
    { title: 'Proposed title', dataIndex: 'proposed_title', key: 'proposed_title', ellipsis: true, render: (v: any) => v || '—' },
    { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true, render: (v: any) => v || '—' },
    {
      title: 'Source run',
      key: 'source_run',
      width: 110,
      render: (_: any, r: any) => (r.source_run_id ? <Typography.Text code>#{r.source_run_id}</Typography.Text> : '—'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (v: string) => <Tag color={v === 'pending' ? 'gold' : v === 'approved' ? 'green' : 'default'}>{v}</Tag>,
    },
    {
      title: '',
      key: 'act',
      width: 190,
      render: (_: any, r: any) =>
        r.status === 'pending' ? (
          <Space>
            <Button size="small" type="primary" loading={busyId === r.id} onClick={() => approve(r)}>
              Approve
            </Button>
            <Button size="small" danger loading={busyId === r.id} onClick={() => reject(r)}>
              Reject
            </Button>
          </Space>
        ) : (
          <span style={{ fontSize: 12, color: '#8a8f8a' }}>
            {r.reviewed_by ? `by ${r.reviewed_by}` : ''} {r.reviewed_at ? fmtTime(r.reviewed_at) : ''}
          </span>
        ),
    },
  ];

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Suggestions</div>
        <div style={{ flex: 1 }} />
        <Checkbox checked={showAll} onChange={(e) => setShowAll(e.target.checked)}>
          Show all (not just pending)
        </Checkbox>
        <Button onClick={load} loading={loading}>
          Refresh
        </Button>
      </div>
      <p style={{ fontSize: 12.5, color: '#8a8f8a', margin: '0 0 12px', maxWidth: 820 }}>
        The ONLY way AI/workflow code can affect Knowledge: every suggestion below waits for a human decision here. Approving
        either updates the target article or creates a new one (source: ai-suggested); rejecting never touches any article.
      </p>
      <Table
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={rows}
        columns={columns as any}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: showAll ? 'No suggestions yet' : 'Nothing pending review right now' }}
      />
    </div>
  );
}

// ---- section 4: Retrieval test ----------------------------------------------------

const fmtScore = (v: any) => (Number.isFinite(Number(v)) ? String(Math.round(Number(v) * 10) / 10) : '?');

function RetrievalPanel() {
  const api = useAPIClient();
  const [searchText, setSearchText] = useState('');
  const [useCase, setUseCase] = useState('');
  const [limit, setLimit] = useState<number | null>(8);
  const [loading, setLoading] = useState(false);
  const [ran, setRan] = useState<{ q: string; hits: any[] } | null>(null);

  const run = async (raw: string) => {
    const q = (raw || '').trim();
    if (!q) {
      setRan(null);
      return;
    }
    setLoading(true);
    try {
      const data = await neoaiAction(api, 'knowledgeSearch', { q, useCase: useCase || undefined, limit: limit || 8 });
      setRan({ q, hits: Array.isArray(data?.results) ? data.results : [] });
    } catch (e: any) {
      message.error(e?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 900 }}>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Retrieval test</div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Runs the exact keyword scorer (neoai:knowledgeSearch) used by AI context assembly — tune tags/wording here and see
        which snippets a draft/workflow would receive.
      </Typography.Paragraph>
      <Space size={12} wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          enterButton="Search"
          placeholder="Search knowledge…"
          style={{ width: 460 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onSearch={run}
          loading={loading}
        />
        <Select
          allowClear
          value={useCase || undefined}
          onChange={(v: any) => setUseCase(v ?? '')}
          style={{ width: 220 }}
          placeholder="Any use case"
          options={USE_CASE_SUGGESTIONS.map((v) => ({ value: v, label: v }))}
        />
        <InputNumber min={1} max={20} precision={0} addonBefore="Limit" style={{ width: 140 }} value={limit} onChange={(v: any) => setLimit(v)} />
      </Space>
      <Spin spinning={loading}>
        {!ran ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 48 }} description="Type a query and press search" />
        ) : ran.hits.length === 0 ? (
          <Empty style={{ padding: 48 }} description={`No hits for "${ran.q}"`} />
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Text type="secondary">
              {ran.hits.length} hit(s) for "{ran.q}"
            </Typography.Text>
            {ran.hits.map((hit: any, i: number) => (
              <Card key={hit.id ?? i} size="small">
                <Space size={8} wrap style={{ marginBottom: 8 }}>
                  <Typography.Text strong>{hit.title || `Article #${hit.id ?? '?'}`}</Typography.Text>
                  <Tag color={NEOHOME_GREEN}>score {fmtScore(hit.score)}</Tag>
                  {hit.use_case ? <Tag>{hit.use_case}</Tag> : null}
                </Space>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {hit.snippet || '—'}
                </Typography.Paragraph>
              </Card>
            ))}
          </Space>
        )}
      </Spin>
    </div>
  );
}

// ---- the console page -------------------------------------------------------------

/**
 * Only ever mounted behind `ConsoleAccessGate` — see `KnowledgeConsolePage` below.
 *
 * FOUND BY CLICKING, not by reading (Bündel B). While verifying the NeoAI console's new refusal
 * state, the same walk was done here as `member` and this console did the OLD thing: the article
 * table rendered "No articles yet" — the EMPTY state, not a refusal — with two repeating
 * "Load failed: Request failed with status code 403" toasts beside it, and a "New article" button
 * the caller may not use. Same defect class as ticket 7466a838, one console over, and the reason
 * it was missed is that the ticket named "the eight areas of the NeoAI console" and this is a
 * sibling with its own route tree.
 *
 * Every action behind this surface is gated by `requireAdmin`, and since Bündel B its collections
 * are snippet-only too — so the verdict is the same one `neoai:access` already answers.
 */
function KnowledgeConsoleBody() {
  useEffect(() => {
    ensureInterFont();
  }, []);
  const pathname = window.location.pathname;
  const embedded = pathname.startsWith('/admin');
  const prefix = embedded ? '/admin' : '';
  const active = activeTabFromPath(pathname);
  const go = (href: string) => window.location.assign(href);

  return (
    <ConfigProvider theme={NEOHOME_THEME as any} getPopupContainer={(n) => (n?.parentElement as HTMLElement) ?? document.body}>
      <div
        style={{
          display: 'flex',
          height: embedded ? 'calc(100vh - 46px)' : '100vh',
          background: '#fff',
          fontFamily: "'Inter', -apple-system, 'Segoe UI', Roboto, sans-serif",
          color: '#1b1e21',
        }}
      >
        <aside
          style={{
            width: 216,
            borderRight: '1px solid #ececea',
            padding: '14px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '2px 8px 12px' }}>
            <img src={NEOMODUL_FAVICON_SRC} alt="Neomodul" style={{ width: 26, height: 26, borderRadius: 7 }} />
            <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-.01em' }}>Knowledge</span>
          </div>
          {TABS.map((t) => (
            <SideItem key={t.key} icon={t.icon} label={t.label} active={active === t.key} onClick={() => go(`${prefix}/neoai-knowledge/${t.key}`)} />
          ))}
          <div style={{ borderTop: '1px solid #ececea', margin: '10px 4px' }} />
          <SideItem icon="RobotOutlined" label="NeoAI" muted onClick={() => go(`${prefix}/neoai/workflows`)} />
          <SideItem icon="HomeOutlined" label="Admin" muted onClick={() => go('/admin')} />
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 10.5, color: '#b0b4ba', padding: '0 8px 4px' }}>Human-gated · AI can only suggest</div>
        </aside>
        <main style={{ flex: 1, overflow: 'auto', minWidth: 0, background: '#fff' }}>
          {active === 'articles' ? <ArticlesPanel /> : null}
          {active === 'prompts' ? <PromptsPanel /> : null}
          {active === 'suggestions' ? <SuggestionsPanel /> : null}
          {active === 'retrieval' ? <RetrievalPanel /> : null}
        </main>
      </div>
    </ConfigProvider>
  );
}

/**
 * What the router mounts. One access question, asked once, before the article table exists.
 *
 * Wrapping the PAGE rather than branching inside the body is what makes "no polling after a 403"
 * true by construction: `usePoll` fires on mount, so a body that mounts has already asked.
 */
export function KnowledgeConsolePage() {
  return (
    <ConsoleAccessGate area="The Knowledge hub">
      <KnowledgeConsoleBody />
    </ConsoleAccessGate>
  );
}
