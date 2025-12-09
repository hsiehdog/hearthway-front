type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

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

export type ExpensePayment = {
  id: string;
  expenseId: string;
  payerId: string;
  amount: string;
  currency: string;
  notes?: string | null;
  receiptUrl?: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UploadedExpense = {
  id: string;
  expenseId: string;
  uploadedById: string | null;
  fileUrl: string;
  fileType: string;
  originalFileName: string;
  storageBucket: string;
  storageKey: string;
  parsingStatus: "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED";
  rawText?: string | null;
  parsedJson?: unknown;
  errorMessage?: string | null;
  signedUrl?: string;
  signedUrlExpiresIn?: number;
  createdAt: string;
  updatedAt: string;
};

export type Expense = {
  id: string;
  groupId: string;
  status?: "PENDING" | "PAID" | "REIMBURSED" | "PARTIALLY_PAID";
  amount: string;
  currency: string;
  date: string;
  name: string;
  vendor?: string | null;
  description?: string | null;
  splitType: "EVEN" | "PERCENT" | "SHARES";
  participants: ExpenseParticipant[];
  participantCosts?: Record<string, string>;
  lineItems: ExpenseLineItem[];
  payments?: ExpensePayment[];
  uploads?: UploadedExpense[];
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  type: "PROJECT" | "TRIP";
  startDate?: string | null;
  endDate?: string | null;
  primaryLocation?: string | null;
  members: GroupMember[];
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
};

export type TripIntelResponse = {
  tripId: string;
  sections: Partial<Record<TripIntelSection, TripIntelSectionResponse>>;
};

export type TripIntelSection = "snapshot" | "weather" | "currency" | "packing";

export type TripIntelSectionResponse = {
  content: string;
  generatedAt: string;
  model: string;
  fromCache: boolean;
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
    {
      id: "balance",
      label: "Open balance",
      value: "$1,870",
      delta: -2,
      helper: "Lower is better",
    },
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
      {
        id: "m2",
        userId: null,
        displayName: "Maya",
        email: "maya@example.com",
      },
    ],
    expenses: [
      {
        id: "e1",
        groupId: "demo-group",
        amount: "120.50",
        currency: "USD",
        date: new Date().toISOString(),
        name: "Tapas night",
        description: "Tapas night",
        splitType: "EVEN",
        participantCosts: { m1: "60.25", m2: "60.25" },
        participants: [
          { id: "ep1", expenseId: "e1", memberId: "m1", shareAmount: "60.25" },
          { id: "ep2", expenseId: "e1", memberId: "m2", shareAmount: "60.25" },
        ],
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
        payments: [],
        createdAt: new Date().toISOString(),
      },
    ],
  } satisfies Group,
  groups: [] as Group[],
};
mockData.groups.push(mockData.group);

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
    .sort(
      (a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime(),
    )
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
  startDate?: string;
  endDate?: string;
  location?: string;
};

export async function createGroup(payload: CreateGroupPayload): Promise<Group> {
  if (isMock) {
    await delay(320);
    return {
      ...mockData.group,
      id: crypto.randomUUID(),
      name: payload.name,
      type: payload.type ?? "PROJECT",
      startDate: payload.startDate ?? null,
      endDate: payload.endDate ?? null,
      primaryLocation: payload.location ?? null,
      members: [
        {
          id: crypto.randomUUID(),
          userId: "mock-user",
          user: {
            id: "mock-user",
            name: "You",
            email: "you@example.com",
          },
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

export async function fetchGroups(): Promise<Group[]> {
  if (isMock) {
    await delay(220);
    return mockData.groups;
  }

  const response = await request<{ groups: Group[] }>("/groups", "GET");
  return response.groups;
}

export async function fetchTripIntel(tripId: string, sections?: TripIntelSection[]): Promise<TripIntelResponse> {
  if (isMock) {
    await delay(180);
    return {
      tripId,
      sections: {
        snapshot: {
          content:
            "Trip Overview:\nYou’re heading to Whistler for a long weekend focused on skiing and snowy nightlife.\n\nTrip Vibe:\nHigh-energy winter adventure\n\nPlanning Posture:\n- Lock in lift tickets early\n- Budget extra time for mountain shuttles\n- Plan one recovery evening",
          generatedAt: new Date().toISOString(),
          model: "mock-model",
          fromCache: true,
        },
        weather: {
          content:
            "Weather Snapshot:\n- Typical daytime temps in the mid 20s–30s F\n- Snow is likely at higher elevations with icy mornings\n- Pack layers, waterproof outerwear, and shoes with traction",
          generatedAt: new Date().toISOString(),
          model: "mock-model",
          fromCache: true,
        },
        currency: {
          content:
            "Currency & Payments:\n- Local currency: CAD; cards widely accepted in cities/resorts\n- Keep a small amount of cash for shuttles, small cafes, and tips\n- Tipping: ~15-20% at restaurants; round up for quick service",
          generatedAt: new Date().toISOString(),
          model: "mock-model",
          fromCache: true,
        },
        packing: {
          content:
            "Packing Suggestions:\n- Waterproof outer shell, insulating mid-layer, and moisture-wicking base layers\n- Snow boots or shoes with traction; warm hat and gloves\n- Travel-size sunscreen, lip balm, and a compact daypack for the slopes",
          generatedAt: new Date().toISOString(),
          model: "mock-model",
          fromCache: true,
        },
      },
    };
  }

  const search = sections?.length ? `?sections=${sections.join(",")}` : "";
  return request<TripIntelResponse>(`/trips/${tripId}/intel${search}`, "GET");
}

export type AddGroupMemberPayload = {
  groupId: string;
  displayName: string;
  email?: string;
};

export async function addMemberToGroup(
  payload: AddGroupMemberPayload,
): Promise<Group> {
  if (isMock) {
    await delay(200);
    const newMember = {
      id: crypto.randomUUID(),
      userId: null,
      displayName: payload.displayName,
      email: payload.email,
    };
    mockData.group.members.push(newMember);
    return mockData.group;
  }

  const response = await request<{ group: Group }>(
    `/groups/${payload.groupId}/members`,
    "POST",
    { displayName: payload.displayName, email: payload.email },
  );
  return response.group;
}

export type CreateExpensePayload = {
  groupId: string;
  status?: Expense["status"];
  amount: number;
  currency?: string;
  date?: string;
  name: string;
  vendor?: string;
  description?: string;
  splitType: Expense["splitType"];
  participants?: { memberId: string; shareAmount?: number }[];
  lineItems?: {
    description?: string;
    category?: string;
    quantity?: number;
    unitAmount?: number;
    totalAmount: number;
  }[];
};

export async function createExpense(
  payload: CreateExpensePayload,
): Promise<Expense> {
  if (isMock) {
    await delay(320);
    const now = new Date().toISOString();
    return {
      id: crypto.randomUUID(),
      groupId: payload.groupId,
      amount: payload.amount.toString(),
      currency: payload.currency || "USD",
      date: payload.date || now,
      name: payload.name,
      vendor: payload.vendor ?? undefined,
      description: payload.description,
      splitType: payload.splitType,
      status: payload.status,
      participants:
        payload.participants?.map((p) => ({
          id: crypto.randomUUID(),
          expenseId: "mock-expense",
          memberId: p.memberId,
          shareAmount: p.shareAmount?.toString() ?? null,
        })) ?? [],
      participantCosts: {},
      lineItems:
        payload.lineItems?.map((item) => ({
          id: crypto.randomUUID(),
          description: item.description,
          category: item.category,
          quantity: (item.quantity ?? 1).toString(),
          unitAmount: (item.unitAmount ?? item.totalAmount).toString(),
          totalAmount: item.totalAmount.toString(),
        })) ?? [],
      payments: [],
      createdAt: now,
    };
  }

  const response = await request<{ expense: Expense }>(
    "/expenses",
    "POST",
    payload,
  );
  return response.expense;
}

export type UpdateExpensePayload = CreateExpensePayload & { id: string };

export async function updateExpense(
  payload: UpdateExpensePayload,
): Promise<Expense> {
  if (isMock) {
    await delay(200);
    return {
      ...(mockData.group.expenses[0] ?? (await createExpense(payload))),
      ...payload,
      id: payload.id,
      participantCosts: {},
      createdAt: new Date().toISOString(),
    };
  }

  const { id, ...body } = payload;
  const response = await request<{ expense: Expense }>(
    `/expenses/${id}`,
    "PUT",
    body,
  );
  return response.expense;
}

export type PayExpensePayload = {
  expenseId: string;
  amount: number;
  payerMemberId: string;
  notes?: string;
  paidAt?: string;
  receiptUrl?: string;
};

export async function payExpense(
  payload: PayExpensePayload,
): Promise<{ expense: Expense }> {
  const { expenseId, ...body } = payload;
  const response = await request<{
    expense: Expense;
    payment: ExpensePayment;
    outstanding: string;
  }>(`/expenses/${expenseId}/payments`, "POST", body);
  return { expense: response.expense };
}

export type UpdateExpensePaymentPayload = PayExpensePayload & {
  paymentId: string;
};

export async function updateExpensePayment(
  payload: UpdateExpensePaymentPayload,
): Promise<{ expense: Expense }> {
  const { expenseId, paymentId, ...body } = payload;
  const response = await request<{ expense: Expense }>(
    `/expenses/${expenseId}/payments/${paymentId}`,
    "PUT",
    body,
  );
  return response;
}

export async function deleteExpensePayment(
  expenseId: string,
  paymentId: string,
): Promise<{ expense: Expense }> {
  if (isMock) {
    await delay(100);
    const expense = mockData.group.expenses.find((e) => e.id === expenseId);
    if (!expense) {
      throw new Error("Expense not found");
    }
    expense.payments = (expense.payments ?? []).filter(
      (p) => p.id !== paymentId,
    );
    return { expense: expense as Expense };
  }

  const response = await request<{ expense: Expense }>(
    `/expenses/${expenseId}/payments/${paymentId}`,
    "DELETE",
  );
  return response;
}

export async function deleteExpense(id: string): Promise<void> {
  if (isMock) {
    await delay(100);
    return;
  }

  await request(`/expenses/${id}`, "DELETE");
}

export async function fetchExpense(expenseId: string): Promise<Expense> {
  if (isMock) {
    await delay(200);
    return {
      ...mockData.group.expenses[0],
      id: expenseId,
      uploads: mockData.group.expenses[0].uploads,
    };
  }

  const response = await request<{ expense: Expense }>(
    `/expenses/${expenseId}`,
    "GET",
  );
  return response.expense;
}

export async function uploadExpenseFile(
  groupId: string,
  file: File,
): Promise<Expense> {
  if (isMock) {
    await delay(200);
    const expense: Expense = {
      ...mockData.group.expenses[0],
      id: crypto.randomUUID(),
      groupId,
    };
    return expense;
  }

  const presign = await requestUploadUrl(
    groupId,
    file.name,
    file.type || "application/octet-stream",
  );
  const putResponse = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });

  if (!putResponse.ok) {
    const message = await putResponse.text();
    throw new Error(message || "Upload failed");
  }

  await completeUpload(presign.upload.id);
  return fetchExpense(presign.expenseId);
}

export type PresignUploadResponse = {
  upload: UploadedExpense;
  expenseId: string;
  uploadUrl: string;
};

export async function requestUploadUrl(
  groupId: string,
  fileName: string,
  contentType: string,
): Promise<PresignUploadResponse> {
  const response = await request<PresignUploadResponse>(
    `/groups/${groupId}/expense-uploads/presign`,
    "POST",
    {
      fileName,
      contentType,
    },
  );
  return response;
}

export async function completeUpload(
  uploadId: string,
): Promise<{ upload: UploadedExpense }> {
  const response = await request<{ upload: UploadedExpense }>(
    `/uploads/${uploadId}/complete`,
    "POST",
  );
  return response;
}

export async function uploadExpenseBatch(
  groupId: string,
  files: File[],
): Promise<{
  uploads: UploadedExpense[];
  expenseIds: string[];
}> {
  if (isMock) {
    await delay(200);
    const expenseIds = files.map(() => crypto.randomUUID());
    return { uploads: [], expenseIds };
  }

  const results: { upload: UploadedExpense; expenseId: string }[] = [];

  for (const file of files) {
    const presign = await requestUploadUrl(
      groupId,
      file.name,
      file.type || "application/octet-stream",
    );

    const putResponse = await fetch(presign.uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    });

    if (!putResponse.ok) {
      throw new Error(`Failed to upload ${file.name}`);
    }

    await completeUpload(presign.upload.id);
    results.push({ upload: presign.upload, expenseId: presign.expenseId });
  }

  return {
    uploads: results.map((r) => r.upload),
    expenseIds: results.map((r) => r.expenseId),
  };
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
