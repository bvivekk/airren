import Image from "next/image";

export const metadata = { title: "About" };

const TEAM = [
  { name: "Amina Cole", role: "Founder & CEO" },
  { name: "Leo Park", role: "President & COO" },
  { name: "Sofia Rahman", role: "Chief Product Officer" },
  { name: "Jonah Ellis", role: "Chief Technology Officer" },
  { name: "Mira Chen", role: "Chief Marketing Officer" },
  { name: "Diego Alvarez", role: "Head of Homes" },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-16 text-center">
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
        Building the infrastructure to experience the world.
      </h1>
      <div className="relative mx-auto mt-12 aspect-[16/9] max-w-3xl overflow-hidden rounded-[28px]">
        <Image
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80"
          alt="People in a bright studio"
          fill
          className="object-cover"
        />
      </div>
      <p className="mx-auto mt-12 max-w-2xl text-left text-[15px] leading-7 text-foreground/90">
        Airren exists so a stay can feel like a reset, not a transaction. Beautiful houses, clean rooms, and a concierge that answers at 2am. Behind that, software that lets operators keep the same standard every night. The product is the feeling guests take home.
      </p>
      <h2 className="mt-20 text-2xl font-semibold">A team on a mission to deliver more happiness.</h2>
      <ul className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {TEAM.map((person) => (
          <li key={person.name} className="rounded-3xl bg-pill px-4 py-8">
            <p className="font-semibold">{person.name}</p>
            <p className="mt-1 text-sm text-muted">{person.role}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
