#!/usr/bin/env node
/**
 * 同步 uploads 目录中的文件到数据库
 * 用于修复 Prisma 版本问题导致的数据库记录丢失
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const UPLOAD_DIR = './storage/uploads';

async function sync() {
  console.log('=== Syncing files to database ===');
  
  const files = await fs.readdir(UPLOAD_DIR);
  const imageFiles = files.filter(f => f.endsWith('.jpg') && !f.includes('.thumb.'));
  
  console.log(`Found ${imageFiles.length} image files`);
  
  for (const filename of imageFiles) {
    const filepath = join(UPLOAD_DIR, filename);
    const thumbFilename = filename.replace('.jpg', '.thumb.jpg');
    const thumbPath = join(UPLOAD_DIR, thumbFilename);
    
    // 检查是否已存在
    const existing = await prisma.resource.findFirst({
      where: { filename }
    });
    
    if (existing) {
      console.log(`  ✓ ${filename} already in database`);
      continue;
    }
    
    // 获取文件信息
    const stats = await fs.stat(filepath);
    const hasThumb = files.includes(thumbFilename);
    
    // 创建数据库记录
    await prisma.resource.create({
      data: {
        type: 'background', // 默认为 background
        filename,
        originalName: filename,
        mimeType: 'image/jpeg',
        size: stats.size,
        path: filepath,
        url: `/api/assets/${filename}`,
        width: null,
        height: null,
      }
    });
    
    console.log(`  ✓ ${filename} added to database (thumb: ${hasThumb})`);
  }
  
  console.log('=== Sync completed ===');
  await prisma.$disconnect();
}

sync().catch(e => {
  console.error('Sync failed:', e);
  process.exit(1);
});
