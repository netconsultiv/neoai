// src/client/console/McpServersPanel.tsx
// -----------------------------------------------------------------------------
// Registered MCP server connections (item 11) — a reusable, named picker
// instead of freehand per-node URLs (owner's explicit "registered-server
// picker" call). Simple list/add/edit/delete UI, same shape as
// FunctionsPanel.tsx. The mcp_tool node's NodeConfigForm (WorkflowsPanel.tsx)
// picks a server by id from this collection instead of typing a URL.

import React, { useState } from 'react';
import { Button, Input, Select, Table, message, Space } from 'antd';
import { useAPIClient } from '@nocobase/client';
import { createResource, listResource, neoaiAction, updateResource, usePoll } from './shared';

export function McpServersPanel() {
  const api = useAPIClient();
  const [rows, setRows] = useState<any[]>([]);
  const [secrets, setSecrets] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ name: string; url: string; auth_header: string; auth_secret_id?: number; description: string }>({
    name: '',
    url: 'https://',
    auth_header: '',
    description: '',
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = async () => {
    try {
      const [m, s] = await Promise.all([
        listResource(api, 'neoai_mcp_servers', { sort: 'name', pageSize: 100, appends: 'auth_secret' }),
        neoaiAction(api, 'secretsList', {}),
      ]);
      setRows(m.rows);
      setSecrets(s.rows ?? []);
    } catch (err: any) {
      message.error(`Load failed: ${err?.message ?? err}`);
    }
  };
  usePoll(load, 30_000, !creating && editingId == null);

  const secretOptions = secrets.map((s) => ({ value: s.id, label: s.name }));

  const resetDraft = () => setDraft({ name: '', url: 'https://', auth_header: '', description: '', auth_secret_id: undefined });

  const create = async () => {
    if (!draft.name.trim() || !draft.url.trim()) {
      message.error('Name and URL are required');
      return;
    }
    try {
      await createResource(api, 'neoai_mcp_servers', {
        name: draft.name.trim(),
        url: draft.url.trim(),
        auth_header: draft.auth_header || undefined,
        auth_secret_id: draft.auth_secret_id ?? null,
        description: draft.description,
      });
      setCreating(false);
      resetDraft();
      await load();
      message.success('MCP server registered');
    } catch (err: any) {
      message.error(`Create failed: ${err?.message ?? err}`);
    }
  };

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setDraft({
      name: r.name ?? '',
      url: r.url ?? '',
      auth_header: r.auth_header ?? '',
      auth_secret_id: r.auth_secret?.id ?? r.auth_secret_id ?? undefined,
      description: r.description ?? '',
    });
  };

  const saveEdit = async () => {
    if (editingId == null) return;
    try {
      await updateResource(api, 'neoai_mcp_servers', editingId, {
        name: draft.name.trim(),
        url: draft.url.trim(),
        auth_header: draft.auth_header || undefined,
        auth_secret_id: draft.auth_secret_id ?? null,
        description: draft.description,
      });
      setEditingId(null);
      resetDraft();
      await load();
      message.success('MCP server updated');
    } catch (err: any) {
      message.error(`Update failed: ${err?.message ?? err}`);
    }
  };

  const remove = async (r: any) => {
    try {
      await api.request({ url: 'neoai_mcp_servers:destroy', method: 'post', params: { filterByTk: r.id } });
      await load();
      message.success('MCP server removed');
    } catch (err: any) {
      message.error(`Delete failed: ${err?.message ?? err}`);
    }
  };

  const columns = [
    { title: 'Name', dataIndex: 'name', render: (v: string) => <code style={{ fontSize: 12 }}>{v}</code> },
    { title: 'URL', dataIndex: 'url', ellipsis: true },
    { title: 'Auth header', dataIndex: 'auth_header', width: 140, render: (v: string) => v || '—' },
    {
      title: 'Auth secret',
      key: 'secret',
      width: 160,
      render: (_: any, r: any) => r.auth_secret?.name ?? '—',
    },
    { title: 'Description', dataIndex: 'description', ellipsis: true },
    {
      title: '',
      key: 'act',
      width: 150,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" onClick={() => startEdit(r)}>
            Edit
          </Button>
          <Button size="small" danger onClick={() => remove(r)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const editorOpen = creating || editingId != null;

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>MCP Servers</div>
        {!editorOpen ? (
          <>
            <Button onClick={load}>Refresh</Button>
            <Button type="primary" onClick={() => setCreating(true)}>
              Register server
            </Button>
          </>
        ) : null}
      </div>
      <p style={{ fontSize: 12.5, color: '#8a8f8a', margin: '0 0 12px', maxWidth: 760 }}>
        Registered MCP (Model Context Protocol) HTTP-transport servers. An <code>mcp_tool</code> workflow node picks one of
        these by name instead of typing a URL per node. Auth secrets are managed in Settings → Secrets vault and never
        appear here in cleartext.
      </p>
      {editorOpen ? (
        <div style={{ border: '1px solid #ececea', borderRadius: 10, padding: 16, marginBottom: 16, maxWidth: 640 }}>
          <Space direction="vertical" style={{ width: '100%' }} size={10}>
            <Input placeholder="Name (e.g. jira)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Input placeholder="https://mcp.example.com/tools" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} />
            <Input
              placeholder='Auth header name (e.g. "Authorization")'
              value={draft.auth_header}
              onChange={(e) => setDraft({ ...draft, auth_header: e.target.value })}
            />
            <Select
              allowClear
              placeholder="Auth secret (optional)"
              style={{ width: '100%' }}
              value={draft.auth_secret_id}
              options={secretOptions}
              onChange={(v) => setDraft({ ...draft, auth_secret_id: v ?? undefined })}
            />
            <Input.TextArea rows={2} placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            <Space>
              <Button type="primary" onClick={editingId != null ? saveEdit : create}>
                {editingId != null ? 'Save' : 'Create'}
              </Button>
              <Button
                onClick={() => {
                  setCreating(false);
                  setEditingId(null);
                  resetDraft();
                }}
              >
                Cancel
              </Button>
            </Space>
          </Space>
        </div>
      ) : null}
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns as any} pagination={false} />
    </div>
  );
}
