import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const username = process.env.ADMIN_USERNAME
  const password = process.env.ADMIN_PASSWORD

  if (!username || !password) {
    console.error('ADMIN_USERNAME and ADMIN_PASSWORD must be set in environment variables')
    process.exit(1)
  }

  const existingAdmin = await prisma.adminUser.findFirst()
  if (existingAdmin) {
    console.log('Admin user already exists, skipping seed')
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)
  await prisma.adminUser.create({
    data: { username, passwordHash },
  })

  console.log(`Admin user '${username}' created successfully`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
