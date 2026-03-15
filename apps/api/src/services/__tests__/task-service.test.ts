import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskStatus } from "@kanban/types";
import { fetchRandomDogImageUrl } from "../dog-api";
import { createTask, deleteTask, getTasks, updateTask } from "../task-service";
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
    it("creates task with dog image URL", async () => {
      const mockTask = {
        id: "task-123",
        title: "Test Task",
        description: "Test Description",
        status: "todo" as TaskStatus,
        dogImageUrl: "https://example.com/dog.jpg",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockReturning = vi.fn().mockResolvedValue([mockTask]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

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
    it("returns user tasks ordered by creation date", async () => {
      const mockTasks = [
        {
          id: "task-1",
          title: "Task 1",
          description: null,
          status: "todo",
          dogImageUrl: "https://example.com/dog1.jpg",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "task-2",
          title: "Task 2",
          description: "Description",
          status: "done",
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
});
