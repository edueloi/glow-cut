import React from "react";
import { motion } from "motion/react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/src/lib/utils";

export function StatCard({ title, value, icon: Icon, trend, description }: {
  title: string,
  value: string | number,
  icon: any,
  trend?: { value: number, isUp: boolean },
  description?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200 hover:shadow-md transition-all group relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700" />

      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500 transition-all duration-300">
          <Icon size={18} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border",
            trend.isUp ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"
          )}>
            {trend.isUp ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{value}</h3>
        {description && <p className="text-[10px] text-zinc-400 mt-1.5 font-medium flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-zinc-300" />
          {description}
        </p>}
      </div>
    </motion.div>
  );
}
