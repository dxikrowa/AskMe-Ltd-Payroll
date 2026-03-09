import { prisma } from "@/lib/prisma";

async function main() {
  // Replace with a real user email that exists in your User table
  const userEmail = process.env.SEED_EMAIL!;
  const user = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!user) throw new Error("User not found. Log in once with Google first.");

  const org = await prisma.organisation.create({
    data: {
      name: "My First Company",
      memberships: {
        create: { userId: user.id, role: "OWNER" },
      },
    },
  });

  console.log("Created org:", org.id);
}

main().finally(async () => {
  await prisma.$disconnect();
});
