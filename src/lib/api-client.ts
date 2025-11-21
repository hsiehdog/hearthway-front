type HttpMethod = "GET" | "POST";

export type UsageMetric = {
  id: string;
  label: string;
  value: string;
  delta: number;
  helper?: string;
};

export type ProjectSummary = {
  id: string;
  name: string;
  status: "active" | "settling" | "settled";
  updatedAt: string;
  owner: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: "deployment" | "alert" | "usage";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  isOptimistic?: boolean;
};

export type GroupMember = {
  id: string;
  userId: string | null;
  displayName: string;
  email?: string | null;
};

export type ExpenseParticipant = {
  id: string;
  expenseId: string;
  memberId: string;
  shareAmount?: string | null;
};

export type ExpenseLineItem = {
  id: string;
  description?: string | null;
  category?: string | null;
  quantity: string;
  unitAmount: string;
  totalAmount: string;
};

export type Expense = {
  id: string;
  groupId: string;
  payerId: string;
  amount: string;
  currency: string;
  date: string;
  category?: string | null;
  note?: string | null;
  splitType: "EVEN" | "PERCENT" | "SHARES";
  participants: ExpenseParticipant[];
  percentMap?: Record<string, number> | null;
  shareMap?: Record<string, number> | null;
  receiptUrl?: string | null;
  lineItems: ExpenseLineItem[];
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  type: "PROJECT" | "TRIP";
  members: GroupMember[];
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
};

type AIChatResponse = {
  id?: string;
  role?: "user" | "assistant" | "system";
  text?: string;
  prompt?: string;
  response?: string;
  sessionId?: string;
  model?: string;
  createdAt?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const isMock = !API_BASE_URL;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: Record<string, unknown>,
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  const headers = new Headers({
    "Content-Type": "application/json",
  });

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Unexpected API error");
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

const mockData = {
  usage: [
    { id: "expenses", label: "Expenses logged", value: "128", delta: 14 },
    { id: "receipts", label: "Receipts saved", value: "76", delta: 9 },
    { id: "people", label: "People squared up", value: "42", delta: 6 },
    { id: "balance", label: "Open balance", value: "$1,870", delta: -2, helper: "Lower is better" },
  ] satisfies UsageMetric[],
  projects: [
    {
      id: "copilot",
      name: "Neighborhood repairs",
      status: "active",
      updatedAt: "5 minutes ago",
      owner: "Cedar Street",
    },
    {
      id: "agenthub",
      name: "Barcelona long weekend",
      status: "settling",
      updatedAt: "24 minutes ago",
      owner: "Trip",
    },
    {
      id: "insights",
      name: "Book club brunches",
      status: "settled",
      updatedAt: "2 days ago",
      owner: "Friends",
    },
  ] satisfies ProjectSummary[],
  activity: [
    {
      id: "deploy-1",
      title: "New expense added",
      description: "Roof patch materials · $240 split evenly",
      timestamp: "Today · 10:42 AM",
      category: "deployment",
    },
    {
      id: "alert-1",
      title: "Receipt uploaded",
      description: "Barcelona dinner receipt attached by Maya",
      timestamp: "Today · 9:17 AM",
      category: "alert",
    },
    {
      id: "usage-1",
      title: "Suggested settlement ready",
      description: "Barcelona trip balances updated with payback plan",
      timestamp: "Yesterday · 6:03 PM",
      category: "usage",
    },
  ] satisfies ActivityItem[],
  chat: [
    {
      id: "intro-1",
      role: "assistant",
      content:
        "Hi! Ask me about your groups or trips—balances, who owes what, or how to split a new expense.",
      createdAt: new Date().toISOString(),
    },
  ] satisfies ChatMessage[],
  group: {
    id: "demo-group",
    name: "Barcelona weekend",
    type: "TRIP",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    members: [
      { id: "m1", userId: "u1", displayName: "You", email: "you@example.com" },
      { id: "m2", userId: null, displayName: "Maya", email: "maya@example.com" },
    ],
    expenses: [
      {
        id: "e1",
        groupId: "demo-group",
        payerId: "m1",
        amount: "120.50",
        currency: "USD",
        date: new Date().toISOString(),
        category: "Dinner",
        note: "Tapas night",
        splitType: "EVEN",
        participants: [
          { id: "ep1", expenseId: "e1", memberId: "m1", shareAmount: "60.25" },
          { id: "ep2", expenseId: "e1", memberId: "m2", shareAmount: "60.25" },
        ],
        percentMap: null,
        shareMap: null,
        receiptUrl: null,
        lineItems: [
          {
            id: "li1",
            description: "Shared plates",
            category: "Food",
            quantity: "1",
            unitAmount: "120.50",
            totalAmount: "120.50",
          },
        ],
        createdAt: new Date().toISOString(),
      },
    ],
  } satisfies Group,
};

export async function fetchUsageMetrics(): Promise<UsageMetric[]> {
  if (isMock) {
    await delay(300);
    return mockData.usage;
  }

  return request<UsageMetric[]>("/analytics/usage", "GET");
}

export async function fetchProjectSummaries(): Promise<ProjectSummary[]> {
  if (isMock) {
    await delay(320);
    return mockData.projects;
  }

  return request<ProjectSummary[]>("/projects", "GET");
}

export async function fetchActivityFeed(): Promise<ActivityItem[]> {
  if (isMock) {
    await delay(280);
    return mockData.activity;
  }

  return request<ActivityItem[]>("/activity", "GET");
}

export async function fetchChatHistory(): Promise<ChatMessage[]> {
  if (isMock) {
    await delay(200);
    return mockData.chat;
  }

  const response = await request<{ sessions: AIChatResponse[] }>(
    "/users/me/sessions",
    "GET",
  );
  return (response.sessions || [])
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .flatMap((entry) => mapSessionToMessages(entry));
}

export async function sendChatMessage(message: string): Promise<ChatMessage> {
  if (isMock) {
    await delay(600);
    return {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        "Here’s a mocked response showing how Hearthway would summarize balances and suggest who to pay.",
      createdAt: new Date().toISOString(),
    };
  }

  const response = await request<{ data: AIChatResponse }>(
    "/ai/generate",
    "POST",
    {
      prompt: message,
    },
  );

  return mapToChatMessage(response.data);
}

export async function updateUserProfile(
  payload: UpdateUserPayload,
): Promise<void> {
  if (isMock) {
    await delay(300);
    return;
  }

  await request("/users/me", "PATCH", payload);
}

export async function changeUserPassword(
  payload: ChangePasswordPayload,
): Promise<void> {
  if (isMock) {
    await delay(300);
    return;
  }

  await request("/users/me/change-password", "POST", payload);
}

export type CreateGroupPayload = {
  name: string;
  type?: Group["type"];
  memberDisplayName?: string;
  memberEmail?: string;
};

export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  if (isMock) {
    await delay(320);
    return {
      ...mockData.group,
      id: crypto.randomUUID(),
      name: payload.name,
      type: payload.type ?? "PROJECT",
      members: [
        {
          id: crypto.randomUUID(),
          userId: "mock-user",
          displayName: payload.memberDisplayName || "You",
          email: payload.memberEmail || "you@example.com",
        },
      ],
      expenses: [],
    };
  }

  const response = await request<{ group: Group }>("/groups", "POST", payload);
  return response.group;
}

export async function fetchGroup(id: string): Promise<Group> {
  if (isMock) {
    await delay(250);
    return {
      ...mockData.group,
      id,
    };
  }

  const response = await request<{ group: Group }>(`/groups/${id}`, "GET");
  return response.group;
}

function mapToChatMessage(
  payload: AIChatResponse,
  fallbackRole: ChatMessage["role"] = "assistant",
): ChatMessage {
  const content = payload.text ?? payload.response ?? payload.prompt ?? "";
  return {
    id: payload.id || crypto.randomUUID(),
    role: payload.role || fallbackRole,
    content,
    createdAt: payload.createdAt || new Date().toISOString(),
  };
}

function mapSessionToMessages(session: AIChatResponse): ChatMessage[] {
  const messages: ChatMessage[] = [];
  if (session.prompt) {
    messages.push(
      mapToChatMessage(
        {
          id: `${session.id || crypto.randomUUID()}-prompt`,
          role: "user",
          text: session.prompt,
          createdAt: session.createdAt,
        },
        "user",
      ),
    );
  }
  messages.push(
    mapToChatMessage(
      {
        id: `${session.id || crypto.randomUUID()}-response`,
        text: session.response ?? session.text ?? "",
        createdAt: session.createdAt,
      },
      "assistant",
    ),
  );
  return messages;
}
export type UpdateUserPayload = {
  name?: string;
};

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};
