import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.vote.deleteMany();
  await prisma.item.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const users = await Promise.all(
    [
      { username: "alice", about: "Co-founder of a YC startup" },
      { username: "bob", about: "Systems programmer" },
      { username: "charlie", about: "ML researcher" },
      { username: "diana", about: "Designer and founder" },
      { username: "eve", about: "Open source maintainer" },
      { username: "frank", about: "DevOps engineer" },
      { username: "grace", about: "Full stack developer" },
      { username: "henry", about: "Data scientist" },
      { username: "iris", about: "Security researcher" },
      { username: "jack", about: "Product manager" },
    ].map(async (u) => {
      const hash = await bcrypt.hash("password123", 10);
      return prisma.user.create({
        data: {
          username: u.username,
          passwordHash: hash,
          about: u.about,
          karma: Math.floor(Math.random() * 5000) + 100,
        },
      });
    })
  );

  console.log(`Created ${users.length} users`);

  const storyTitles = [
    "Spaceship Generator",
    "Y Combinator's Xerox Alto: restoring the legendary 1970s GUI computer",
    "Small Asteroid Is Earth's Constant Companion",
    "Unambiguous JavaScript Grammar",
    "Esh - Statistical Similarity of Binaries",
    "Simple Contracts are Better Contracts: the Meltdown of the DAO",
    "JSON Web Tokens vs. Sessions",
    "Deconstructing the DAO Attack: A Brief Code Tour",
    "Recognizing Bad Advice",
    "Building the Gyroscope App with React Native",
    "Imagine yourself starting, not finishing",
    "Systems Programming in C# by Joe Duffy",
    "The Money Letter That Every Parent Should Write",
    "Understanding the Factors That Impact the Popularity of Github Repositories",
    "N Queens on an FPGA (2014) [pdf]",
    "How Frankenstein's Monster Became Human",
    "Rust's Error Handling",
    "The Rise and Fall of Bitcoin",
    "Why Kubernetes is Overkill for Most Projects",
    "Machine Learning at the Edge",
    "Building a Compiler in a Weekend",
    "The State of WebAssembly in 2025",
    "Rethinking Microservices",
    "PostgreSQL Full-Text Search Performance",
    "Modern CSS Layout Techniques",
    "The End of Moore's Law",
    "Async/Await in Rust",
    "Building a Distributed Consensus Algorithm",
    "The Future of Programming Languages",
    "Optimizing JavaScript Bundle Size",
    "Docker Security Best Practices",
    "GraphQL vs REST: Making the Right Choice",
    "Building a Real-time Chat Application",
    "The History of Unix",
    "Understanding Linux Containers",
    "Designing Scalable Systems",
    "The Unreasonable Effectiveness of Data",
    "Building Better APIs",
    "The Death of Flash",
    "Functional Programming in JavaScript",
  ];

  const domains = [
    "github.com",
    "arxiv.org",
    "news.ycombinator.com",
    "medium.com",
    "dev.to",
    "substack.com",
    "nytimes.com",
    "wired.com",
    "arstechnica.com",
    "techcrunch.com",
    "theverge.com",
    "codepen.io",
    "stackoverflow.com",
    "rust-lang.org",
    "python.org",
  ];

  // Create stories with varied scores and ages
  const stories: any[] = [];
  for (let i = 0; i < 60; i++) {
    const createdAt = new Date(
      Date.now() - Math.random() * 48 * 60 * 60 * 1000 // Last 48 hours
    );
    const points = Math.floor(Math.exp(Math.random() * 5)); // Exponential distribution
    const story = await prisma.item.create({
      data: {
        type: ["story", "ask", "show", "job"][Math.floor(Math.random() * 4)],
        title: storyTitles[i % storyTitles.length],
        url: `https://${domains[Math.floor(Math.random() * domains.length)]}/story-${i}`,
        authorId: users[Math.floor(Math.random() * users.length)].id,
        points,
        rankScore: 0, // Will be computed by ranking sweep
        createdAt,
        path: String(i + 1).padStart(6, "0"),
        depth: 0,
      },
    });
    stories.push(story);
  }

  console.log(`Created ${stories.length} stories`);

  // Add comments to some stories, including a deep thread
  const rootStory = stories[0];
  let parentId = rootStory.id;
  let pathPrefix = String(rootStory.id).padStart(6, "0");

  // Deep thread (10+ levels)
  for (let depth = 1; depth <= 12; depth++) {
    const comment = await prisma.item.create({
      data: {
        type: "comment",
        text: `This is a nested comment at depth ${depth}. ${
          depth % 3 === 0 ? "This one is contentious." : "Thoughtful response."
        }`,
        authorId: users[Math.floor(Math.random() * users.length)].id,
        parentId,
        path: `${pathPrefix}.${String(depth).padStart(6, "0")}`,
        depth,
        points: Math.floor(Math.random() * 50) + 1,
      },
    });
    parentId = comment.id;
  }

  // Highly commented story (200+ comments)
  const busyStory = stories[1];
  let commentCount = 0;
  for (let i = 0; i < 50; i++) {
    const topComment = await prisma.item.create({
      data: {
        type: "comment",
        text: `Top-level comment ${i + 1}. This is interesting feedback.`,
        authorId: users[Math.floor(Math.random() * users.length)].id,
        parentId: busyStory.id,
        path: `${String(busyStory.id).padStart(6, "0")}.${String(i + 1).padStart(6, "0")}`,
        depth: 1,
        points: Math.floor(Math.random() * 30) + 1,
      },
    });
    commentCount++;

    // Add replies to each top comment
    for (let j = 0; j < 3; j++) {
      await prisma.item.create({
        data: {
          type: "comment",
          text: `Reply ${j + 1} to comment ${i + 1}.`,
          authorId: users[Math.floor(Math.random() * users.length)].id,
          parentId: topComment.id,
          path: `${String(busyStory.id).padStart(6, "0")}.${String(i + 1).padStart(6, "0")}.${String(j + 1).padStart(6, "0")}`,
          depth: 2,
          points: Math.floor(Math.random() * 15) + 1,
        },
      });
      commentCount++;
    }
  }

  // Update commentCount on busy story
  await prisma.item.update({
    where: { id: busyStory.id },
    data: { commentCount },
  });

  console.log(`Created ${commentCount} comments on busy story`);

  // Add some votes
  for (let i = 0; i < 100; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomItem = stories[Math.floor(Math.random() * stories.length)];
    try {
      await prisma.vote.create({
        data: {
          userId: randomUser.id,
          itemId: randomItem.id,
        },
      });
    } catch {
      // Ignore unique constraint violations
    }
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
