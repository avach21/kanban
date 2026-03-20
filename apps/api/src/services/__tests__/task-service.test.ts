import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskStatus } from "@kanban/types";
import { fetchRandomDogImageUrl } from "../dog-api.ts";
import {
  createTask,
  deleteTask,
  getTasks,
  moveTask,
  updateTask,
} from "../task-service.ts";
import { createDb } from "@kanban/db";

vi.mock("../dog-api", () => ({
  fetchRandomDogImageUrl: vi.fn(),
}));

vi.mock("@kanban/db", () => ({
  createDb: vi.fn(),
  tasks: {
    id: {},
    title: {},
    description: {},
    status: {},
    position: {},
    dogImageUrl: {},
    createdAt: {},
    updatedAt: {},
    userId: {},
  },
}));

const mockDb = {
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("Task Service", () => {
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createDb).mockReturnValue(mockDb as never);
    vi.mocked(fetchRandomDogImageUrl).mockResolvedValue(
      "https://example.com/dog.jpg",
    );
  });

  describe("createTask", () => {
    it("creates task with dog image URL and assigns position", async () => {
      const mockTask = {
        id: "task-123",
        title: "Test Task",
        description: "Test Description",
        status: "todo" as TaskStatus,
        position: 0,
        dogImageUrl: "https://example.com/dog.jpg",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockMaxWhere = vi.fn().mockReturnValue({ from: vi.fn() });
      const mockMaxSelect = vi.fn().mockResolvedValue([{ maxPosition: null }]);
      const mockMaxFrom = vi.fn().mockReturnValue({ where: mockMaxSelect });
      const mockMaxSelectQuery = vi.fn().mockReturnValue({ from: mockMaxFrom });

      const mockReturning = vi.fn().mockResolvedValue([mockTask]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

      mockDb.select = mockMaxSelectQuery;
      mockDb.insert = mockInsert;

      const result = await createTask(mockUserId, {
        title: "Test Task",
        description: "Test Description",
        status: "todo",
      });

      expect(fetchRandomDogImageUrl).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockTask);
    });

    it("propagates error when dog API fails", async () => {
      vi.mocked(fetchRandomDogImageUrl).mockRejectedValue(
        new Error("API failed"),
      );

      await expect(
        createTask(mockUserId, {
          title: "Test Task",
          description: null,
          status: "todo",
        }),
      ).rejects.toThrow("API failed");
    });
  });

  describe("getTasks", () => {
    it("returns user tasks ordered by status and position", async () => {
      const mockTasks = [
        {
          id: "task-1",
          title: "Task 1",
          description: null,
          status: "todo",
          position: 0,
          dogImageUrl: "https://example.com/dog1.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "task-2",
          title: "Task 2",
          description: "Description",
          status: "done",
          position: 0,
          dogImageUrl: "https://example.com/dog2.jpg",
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ];

      const mockOrderBy = vi.fn().mockResolvedValue(mockTasks);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });

      mockDb.select = mockSelect;

      const result = await getTasks(mockUserId);

      expect(result).toEqual(mockTasks);
      expect(mockSelect).toHaveBeenCalledWith({
        id: expect.any(Object),
        title: expect.any(Object),
        description: expect.any(Object),
        status: expect.any(Object),
        position: expect.any(Object),
        dogImageUrl: expect.any(Object),
        createdAt: expect.any(Object),
        updatedAt: expect.any(Object),
      });
      expect(mockFrom).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
      expect(mockOrderBy).toHaveBeenCalled();
    });
  });

  describe("updateTask", () => {
    it("updates task successfully", async () => {
      const mockUpdatedTask = {
        id: "task-123",
        title: "Updated Title",
        description: "Updated Description",
        status: "in_progress" as TaskStatus,
        position: 0,
        dogImageUrl: "https://example.com/dog.jpg",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: new Date().toISOString(),
      };

      const mockReturning = vi.fn().mockResolvedValue([mockUpdatedTask]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

      mockDb.update = mockUpdate;

      const result = await updateTask(mockUserId, "task-123", {
        title: "Updated Title",
        description: "Updated Description",
        status: "in_progress",
      });

      expect(result).toBeDefined();
      if (!result) {
        throw new Error("Expected updated task to be defined");
      }

      expect(result).toEqual(mockUpdatedTask);
    });

    it("returns undefined when task is not found", async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

      mockDb.update = mockUpdate;

      const result = await updateTask(mockUserId, "task-123", {
        title: "New Title",
      });

      expect(result).toBeUndefined();
    });
  });

  describe("deleteTask", () => {
    it("deletes task successfully", async () => {
      const mockDeletedTask = { id: "task-123" };

      const mockReturning = vi.fn().mockResolvedValue([mockDeletedTask]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });

      mockDb.delete = mockDelete;

      const result = await deleteTask(mockUserId, "task-123");

      expect(result).toEqual(mockDeletedTask);
    });

    it("returns undefined when task is not found", async () => {
      const mockReturning = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });

      mockDb.delete = mockDelete;

      const result = await deleteTask(mockUserId, "task-123");

      expect(result).toBeUndefined();
    });
  });

  describe("status transitions", () => {
    it("allows valid status transitions", async () => {
      const validStatuses: TaskStatus[] = ["todo", "in_progress", "done"];

      for (const toStatus of validStatuses) {
        const mockUpdatedTask = {
          id: "task-123",
          title: "Task",
          description: null,
          status: toStatus,
          dogImageUrl: "https://example.com/dog.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: new Date().toISOString(),
        };

        const mockReturning = vi.fn().mockResolvedValue([mockUpdatedTask]);
        const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
        const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
        const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

        mockDb.update = mockUpdate;

        const result = await updateTask(mockUserId, "task-123", {
          status: toStatus,
        });

        expect(result).toBeDefined();
        if (!result) {
          throw new Error("Expected updated task to be defined");
        }

        expect(result.status).toBe(toStatus);
      }
    });

    it("accepts each valid status value", async () => {
      const validStatuses: TaskStatus[] = ["todo", "in_progress", "done"];

      for (const status of validStatuses) {
        const mockUpdatedTask = {
          id: "task-123",
          title: "Task",
          description: null,
          status,
          position: 0,
          dogImageUrl: "https://example.com/dog.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: new Date().toISOString(),
        };

        const mockReturning = vi.fn().mockResolvedValue([mockUpdatedTask]);
        const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
        const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
        const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });

        mockDb.update = mockUpdate;

        const result = await updateTask(mockUserId, "task-123", { status });

        expect(result).toBeDefined();
        if (!result) {
          throw new Error("Expected updated task to be defined");
        }

        expect(result.status).toBe(status);
      }
    });
  });

  describe("moveTask", () => {
    it("returns undefined when task is not found", async () => {
      // Mock the select chain for getting current task (returns empty array)
      const mockWhereCurrent = vi.fn().mockResolvedValue([]);
      const mockFromCurrent = vi.fn().mockReturnValue({ where: mockWhereCurrent });

      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({ from: mockFromCurrent });

      const result = await moveTask(mockUserId, "task-123", {
        toStatus: "in_progress",
        toIndex: 0,
      });

      expect(result).toBeUndefined();
    });

    it("handles same-column reorder", async () => {
      const mockCurrentTask = {
        id: "task-123",
        status: "todo" as TaskStatus,
        position: 0,
      };

      const mockColumnTasks = [
        { id: "task-123", position: 0 },
        { id: "task-456", position: 1 },
        { id: "task-789", position: 2 },
      ];

      const mockAllTasks = [
        {
          id: "task-123",
          title: "Task 1",
          description: null,
          status: "todo" as TaskStatus,
          position: 1,
          dogImageUrl: "https://example.com/dog1.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "task-456",
          title: "Task 2",
          description: null,
          status: "todo" as TaskStatus,
          position: 0,
          dogImageUrl: "https://example.com/dog2.jpg",
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
        {
          id: "task-789",
          title: "Task 3",
          description: null,
          status: "todo" as TaskStatus,
          position: 2,
          dogImageUrl: "https://example.com/dog3.jpg",
          createdAt: "2024-01-03T00:00:00Z",
          updatedAt: "2024-01-03T00:00:00Z",
        },
      ];

      // Mock for getting current task
      const mockCurrentWhere = vi.fn().mockResolvedValueOnce([mockCurrentTask]);
      const mockCurrentFrom = vi.fn().mockReturnValue({ where: mockCurrentWhere });

      // Mock for getting column tasks
      const mockColumnOrderBy = vi.fn().mockResolvedValueOnce(mockColumnTasks);
      const mockColumnWhere = vi.fn().mockReturnValue({ orderBy: mockColumnOrderBy });
      const mockColumnFrom = vi.fn().mockReturnValue({ where: mockColumnWhere });

      // Mock for updates
      const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

      // Mock for final getTasks call
      const mockFinalOrderBy = vi.fn().mockResolvedValueOnce(mockAllTasks);
      const mockFinalWhere = vi.fn().mockReturnValue({ orderBy: mockFinalOrderBy });
      const mockFinalFrom = vi.fn().mockReturnValue({ where: mockFinalWhere });

      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({ from: mockCurrentFrom })
        .mockReturnValueOnce({ from: mockColumnFrom })
        .mockReturnValueOnce({ from: mockFinalFrom });
      mockDb.update = mockUpdate;

      const result = await moveTask(mockUserId, "task-123", {
        toStatus: "todo",
        toIndex: 1,
      });

      expect(result).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("handles cross-column move", async () => {
      const mockCurrentTask = {
        id: "task-123",
        status: "todo" as TaskStatus,
        position: 0,
      };

      const mockSourceTasks = [{ id: "task-456", position: 1 }];
      const mockTargetTasks = [{ id: "task-789", position: 0 }];

      const mockAllTasks = [
        {
          id: "task-123",
          title: "Task 1",
          description: null,
          status: "in_progress" as TaskStatus,
          position: 0,
          dogImageUrl: "https://example.com/dog1.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock for getting current task
      const mockCurrentWhere = vi.fn().mockResolvedValueOnce([mockCurrentTask]);
      const mockCurrentFrom = vi.fn().mockReturnValue({ where: mockCurrentWhere });

      // Mock for getting source column tasks
      const mockSourceOrderBy = vi.fn().mockResolvedValueOnce(mockSourceTasks);
      const mockSourceWhere = vi.fn().mockReturnValue({ orderBy: mockSourceOrderBy });
      const mockSourceFrom = vi.fn().mockReturnValue({ where: mockSourceWhere });

      // Mock for getting target column tasks
      const mockTargetOrderBy = vi.fn().mockResolvedValueOnce(mockTargetTasks);
      const mockTargetWhere = vi.fn().mockReturnValue({ orderBy: mockTargetOrderBy });
      const mockTargetFrom = vi.fn().mockReturnValue({ where: mockTargetWhere });

      // Mock for updates
      const mockUpdateWhere = vi.fn().mockResolvedValue(undefined);
      const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
      const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

      // Mock for final getTasks call
      const mockFinalOrderBy = vi.fn().mockResolvedValueOnce(mockAllTasks);
      const mockFinalWhere = vi.fn().mockReturnValue({ orderBy: mockFinalOrderBy });
      const mockFinalFrom = vi.fn().mockReturnValue({ where: mockFinalWhere });

      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({ from: mockCurrentFrom })
        .mockReturnValueOnce({ from: mockSourceFrom })
        .mockReturnValueOnce({ from: mockTargetFrom })
        .mockReturnValueOnce({ from: mockFinalFrom });
      mockDb.update = mockUpdate;

      const result = await moveTask(mockUserId, "task-123", {
        toStatus: "in_progress",
        toIndex: 0,
      });

      expect(result).toBeDefined();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
