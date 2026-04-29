import { prisma } from "../prisma";

async function check() {
  const id = "6386b01a-dd82-46de-837c-8dd59fe749b5";
  console.log("Checking professional ID:", id);

  const prof = await (prisma as any).professional.findUnique({ where: { id } });
  console.log("Professional found:", prof ? prof.name : "NOT FOUND");

  if (prof) {
    const apptsCount = await (prisma as any).appointment.count({ where: { professionalId: id } });
    console.log("Appointments count:", apptsCount);

    const releasesCount = await (prisma as any).scheduleRelease.count({ where: { professionalId: id } });
    console.log("ScheduleRelease count:", releasesCount);

    const specialDaysCount = await (prisma as any).specialScheduleDay.count({ where: { professionalId: id } });
    console.log("SpecialScheduleDay count:", specialDaysCount);

    const comandasCount = await (prisma as any).comanda.count({ where: { professionalId: id } });
    console.log("Comandas count:", comandasCount);
  }
}

check().catch(console.error);
