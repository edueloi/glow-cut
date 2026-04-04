import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const users = await prisma.adminUser.findMany({
    select: { email: true, password: true, isActive: true }
  })
  console.log('--- AdminUsers ---')
  console.log(users)

  const pros = await prisma.professional.findMany({
    select: { name: true, password: true }
  })
  console.log('--- Professionals ---')
  console.log(pros)
}
main()
