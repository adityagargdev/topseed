import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SPORTS = [
  { name: 'Badminton', icon: '🏸' },
  { name: 'Basketball', icon: '🏀' },
  { name: 'Cricket', icon: '🏏' },
  { name: 'Football', icon: '⚽' },
  { name: 'Handball', icon: '🤾' },
  { name: 'Pickleball', icon: '🏓' },
  { name: 'Squash', icon: '🎾' },
  { name: 'Table Tennis', icon: '🏓' },
  { name: 'Tennis', icon: '🎾' },
  { name: 'Volleyball', icon: '🏐' },
  { name: 'Baseball', icon: '⚾' },
  { name: 'Hockey', icon: '🏑' },
  { name: 'Rugby', icon: '🏉' },
  { name: 'Swimming', icon: '🏊' },
  { name: 'Athletics', icon: '🏃' },
]

async function main() {
  console.log('Seeding sports...')
  for (const sport of SPORTS) {
    await prisma.sport.upsert({
      where: { name: sport.name },
      update: {},
      create: sport,
    })
  }
  console.log('Seeding complete.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
