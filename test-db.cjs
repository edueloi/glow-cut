const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
async function main() {
  try {
    const users = await prisma.adminUser.findMany()
    console.log('--- AdminUsers ---')
    users.forEach(u => console.log(`Email: ${u.email} | Pass: ${u.password} | Active: ${u.isActive}`))

    const pros = await prisma.professional.findMany()
    console.log('--- Professionals ---')
    pros.forEach(p => console.log(`Name: ${p.name} | Pass: ${p.password}`))
    
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
main()
