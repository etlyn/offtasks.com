function Frame1092() {
  return (
    <div className="absolute bg-neutral-50 box-border content-stretch flex gap-[10px] inset-[-2.38%_0.03%_-2.38%_67.52%] items-center justify-center px-[20px] py-[12px] rounded-[12px]">
      <p className="font-['Poppins:Regular',_sans-serif] leading-[1.4] not-italic relative shrink-0 text-[14px] text-nowrap text-zinc-800 whitespace-pre">Upcoming</p>
    </div>
  );
}

export default function Due() {
  return (
    <div className="relative size-full" data-name="Due">
      <div className="absolute bg-zinc-700 bottom-[7.14%] left-0 right-0 rounded-[12px] top-[7.14%]" />
      <p className="absolute font-['Poppins:Regular',_sans-serif] leading-[1.4] left-[7.02%] not-italic right-[80.12%] text-[14px] text-neutral-50 top-[calc(50%-10px)]">Today</p>
      <Frame1092 />
      <p className="absolute font-['Poppins:Regular',_sans-serif] leading-[1.4] left-[43.05%] not-italic right-[43.05%] text-[14px] text-neutral-50 text-nowrap top-[calc(50%-10px)] whitespace-pre">Tomorrow</p>
      <div className="absolute flex inset-[7.14%_68.49%_7.14%_31.51%] items-center justify-center">
        <div className="flex-none h-px rotate-[90deg] w-[36px]">
          <div className="relative size-full">
            <div className="absolute bottom-0 left-0 right-0 top-[-1px]">
              <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 36 1">
                <line id="Line 2" stroke="var(--stroke-0, #27272A)" x2="36" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}