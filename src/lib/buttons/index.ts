/**
 * 按钮分组与按钮管理
 * 提供 CRUD、排序、显示控制、首页展示 DTO 整理
 */

import { prisma } from "@/lib/db";

// ==================== 类型定义 ====================

export interface ButtonGroupWithButtons {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  buttons: Button[];
}

export interface Button {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  openInNew: boolean;
  sortOrder: number;
  isActive: boolean;
  groupId: string;
}

export interface PublicButtonGroup {
  id: string;
  name: string;
  buttons: PublicButton[];
}

export interface PublicButton {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  openInNew: boolean;
}

// ==================== 分组 CRUD ====================

/**
 * 获取所有分组（含按钮数量）
 */
export async function getAllGroups(): Promise<
  Array<{
    id: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    buttonCount: number;
  }>
> {
  const groups = await prisma.buttonGroup.findMany({
    include: {
      _count: { select: { buttons: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    sortOrder: g.sortOrder,
    isActive: g.isActive,
    buttonCount: g._count.buttons,
  }));
}

/**
 * 获取单个分组详情（含按钮）
 */
export async function getGroupById(
  id: string
): Promise<ButtonGroupWithButtons | null> {
  const group = await prisma.buttonGroup.findUnique({
    where: { id },
    include: {
      buttons: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!group) return null;

  return {
    id: group.id,
    name: group.name,
    sortOrder: group.sortOrder,
    isActive: group.isActive,
    buttons: group.buttons.map((b) => ({
      id: b.id,
      title: b.title,
      url: b.url,
      icon: b.icon,
      openInNew: b.openInNew,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      groupId: b.groupId,
    })),
  };
}

/**
 * 创建分组
 */
export async function createGroup(data: {
  name: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<{ id: string }> {
  const group = await prisma.buttonGroup.create({
    data: {
      name: data.name,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });
  return { id: group.id };
}

/**
 * 更新分组
 */
export async function updateGroup(
  id: string,
  data: {
    name?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<void> {
  await prisma.buttonGroup.update({
    where: { id },
    data,
  });
}

/**
 * 删除分组（联动删除按钮）
 */
export async function deleteGroup(id: string): Promise<void> {
  await prisma.buttonGroup.delete({
    where: { id },
  });
}

// ==================== 按钮 CRUD ====================

/**
 * 获取所有按钮（可选按分组筛选）
 */
export async function getAllButtons(groupId?: string): Promise<
  Array<Button & { groupName: string }>
> {
  const buttons = await prisma.button.findMany({
    where: groupId ? { groupId } : undefined,
    include: { group: { select: { name: true } } },
    orderBy: [{ group: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  return buttons.map((b) => ({
    id: b.id,
    title: b.title,
    url: b.url,
    icon: b.icon,
    openInNew: b.openInNew,
    sortOrder: b.sortOrder,
    isActive: b.isActive,
    groupId: b.groupId,
    groupName: b.group.name,
  }));
}

/**
 * 获取单个按钮
 */
export async function getButtonById(id: string): Promise<Button | null> {
  const button = await prisma.button.findUnique({
    where: { id },
  });

  if (!button) return null;

  return {
    id: button.id,
    title: button.title,
    url: button.url,
    icon: button.icon,
    openInNew: button.openInNew,
    sortOrder: button.sortOrder,
    isActive: button.isActive,
    groupId: button.groupId,
  };
}

/**
 * 创建按钮
 */
export async function createButton(data: {
  title: string;
  url: string;
  icon?: string;
  openInNew: boolean;
  sortOrder: number;
  isActive: boolean;
  groupId: string;
}): Promise<{ id: string }> {
  const button = await prisma.button.create({
    data: {
      title: data.title,
      url: data.url,
      icon: data.icon || null,
      openInNew: data.openInNew,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
      groupId: data.groupId,
    },
  });
  return { id: button.id };
}

/**
 * 更新按钮
 */
export async function updateButton(
  id: string,
  data: {
    title?: string;
    url?: string;
    icon?: string;
    openInNew?: boolean;
    sortOrder?: number;
    isActive?: boolean;
    groupId?: string;
  }
): Promise<void> {
  await prisma.button.update({
    where: { id },
    data,
  });
}

/**
 * 删除按钮
 */
export async function deleteButton(id: string): Promise<void> {
  await prisma.button.delete({
    where: { id },
  });
}

// ==================== 首页展示数据 ====================

/**
 * 获取首页公开的按钮分组与按钮
 * - 只返回 isActive = true 的分组
 * - 只返回 isActive = true 的按钮
 * - 按 sortOrder 排序
 * - 隐藏空分组（无可见按钮）
 */
export async function getPublicButtons(): Promise<PublicButtonGroup[]> {
  const groups = await prisma.buttonGroup.findMany({
    where: { isActive: true },
    include: {
      buttons: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  // 过滤掉空分组（无可见按钮）
  return groups
    .filter((g) => g.buttons.length > 0)
    .map((g) => ({
      id: g.id,
      name: g.name,
      buttons: g.buttons.map((b) => ({
        id: b.id,
        title: b.title,
        url: b.url,
        icon: b.icon,
        openInNew: b.openInNew,
      })),
    }));
}

// ==================== 校验工具 ====================

/**
 * 检查分组是否存在
 */
export async function groupExists(id: string): Promise<boolean> {
  const count = await prisma.buttonGroup.count({
    where: { id },
  });
  return count > 0;
}

/**
 * 检查按钮是否存在
 */
export async function buttonExists(id: string): Promise<boolean> {
  const count = await prisma.button.count({
    where: { id },
  });
  return count > 0;
}
