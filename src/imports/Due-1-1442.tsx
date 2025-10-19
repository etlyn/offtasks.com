function Frame1092() {
  return (
    <div className="absolute bg-neutral-50 bottom-0 box-border content-stretch flex gap-[10px] items-center justify-center left-[33.85%] px-[20px] py-[12px] right-[33.69%] rounded-[12px] top-0">
      <p className="font-['Poppins:Regular',_sans-serif] leading-[1.4] not-italic relative shrink-0 text-[14px] text-nowrap text-zinc-800 whitespace-pre">Tomorrow</p>
    </div>
  );
}

export default function Due() {
  return (
    <div className="relative size-full" data-name="Due">
      <div className="absolute bg-zinc-700 bottom-[9.09%] left-0 right-0 rounded-[12px] top-[9.09%]" />
      <p className="absolute font-['Poppins:Regular',_sans-serif] inset-[27.27%_80.12%_27.27%_7.02%] leading-[1.4] not-italic text-[14px] text-neutral-50">Today</p>
      <Frame1092 />
      <p className="absolute font-['Poppins:Regular',_sans-serif] leading-[1.4] left-[76.52%] not-italic right-[9.2%] text-[14px] text-neutral-50 text-nowrap top-[calc(50%-10px)] whitespace-pre">Upcoming</p>
    </div>
  );
}