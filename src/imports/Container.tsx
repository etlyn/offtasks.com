import svgPaths from "./svg-aum7itla9p";

function TaskDialog() {
  return (
    <div className="absolute h-[24px] left-[24px] top-[28px] w-[502px]" data-name="TaskDialog">
      <p className="absolute font-['Poppins:Regular',_sans-serif] leading-[24px] left-0 not-italic text-[16px] text-nowrap text-zinc-100 top-[0.5px] whitespace-pre">Edit Task</p>
    </div>
  );
}

function Label() {
  return (
    <div className="h-[18px] relative shrink-0 w-full" data-name="Label">
      <p className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[18px] left-0 not-italic text-[#9f9fa9] text-[12px] text-nowrap top-px whitespace-pre">Task</p>
    </div>
  );
}

function TextArea() {
  return (
    <div className="absolute h-[96px] left-0 rounded-[8px] top-0 w-[502px]" data-name="Text Area">
      <div className="box-border content-stretch flex h-[96px] items-start overflow-clip p-[12px] relative rounded-[inherit] w-[502px]">
        <p className="font-['Poppins:Regular',_sans-serif] leading-[21px] not-italic relative shrink-0 text-[#71717b] text-[14px] text-nowrap whitespace-pre">What needs to be done today?</p>
      </div>
      <div aria-hidden="true" className="absolute border border-solid border-zinc-700 inset-0 pointer-events-none rounded-[8px]" />
    </div>
  );
}

function Container() {
  return (
    <div className="absolute bg-zinc-900 bottom-[10px] h-[19px] left-[465.13px] rounded-[4px] w-[24.875px]" data-name="Container">
      <p className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[15px] left-[6px] not-italic text-[#71717b] text-[10px] text-nowrap top-[2.5px] tracking-[0.1172px] whitespace-pre">39</p>
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[86px] relative shrink-0 w-full" data-name="Container">
      <TextArea />
      <Container />
    </div>
  );
}

function TaskDialog1() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[122px] items-start relative shrink-0 w-full" data-name="TaskDialog">
      <Label />
      <Container1 />
    </div>
  );
}

function Label1() {
  return (
    <div className="h-[18px] relative shrink-0 w-full" data-name="Label">
      <p className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[18px] left-0 not-italic text-[#9f9fa9] text-[12px] text-nowrap top-px whitespace-pre">When</p>
    </div>
  );
}

function Container2() {
  return <div className="absolute bg-[#3f3f47] h-[26.25px] left-0 rounded-[8px] top-[2.88px] w-[502px]" data-name="Container" />;
}

function Paragraph() {
  return (
    <div className="h-[16.797px] relative shrink-0 w-[63.398px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[16.797px] items-start relative w-[63.398px]">
        <p className="font-['Poppins:Regular',_sans-serif] leading-[16.8px] not-italic relative shrink-0 text-[12px] text-neutral-50 text-nowrap whitespace-pre">Tomorrow</p>
      </div>
    </div>
  );
}

function Button() {
  return (
    <div className="absolute box-border content-stretch flex h-[32px] items-center justify-center left-[167.31px] pl-0 pr-[0.008px] py-0 rounded-[8px] top-0 w-[167.359px]" data-name="Button">
      <Paragraph />
    </div>
  );
}

function Paragraph1() {
  return (
    <div className="h-[16.797px] relative shrink-0 w-[64px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[16.797px] items-start relative w-[64px]">
        <p className="font-['Poppins:Regular',_sans-serif] leading-[16.8px] not-italic relative shrink-0 text-[12px] text-neutral-50 text-nowrap whitespace-pre">Upcoming</p>
      </div>
    </div>
  );
}

function Button1() {
  return (
    <div className="absolute content-stretch flex h-[32px] items-center justify-center left-[334.68px] rounded-[8px] top-0 w-[167.312px]" data-name="Button">
      <Paragraph1 />
    </div>
  );
}

function Container3() {
  return <div className="absolute bg-[#52525c] h-[19.203px] left-[167.31px] opacity-0 top-[6.4px] w-px" data-name="Container" />;
}

function Container4() {
  return <div className="absolute bg-[#52525c] h-[19.203px] left-[334.68px] top-[6.4px] w-px" data-name="Container" />;
}

function Paragraph2() {
  return (
    <div className="h-[16.797px] relative shrink-0 w-[38.617px]" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex h-[16.797px] items-start relative w-[38.617px]">
        <p className="font-['Poppins:Regular',_sans-serif] leading-[16.8px] not-italic relative shrink-0 text-[12px] text-nowrap text-white whitespace-pre">Today</p>
      </div>
    </div>
  );
}

function Button2() {
  return (
    <div className="absolute bg-[#0084d1] box-border content-stretch flex h-[32px] items-center justify-center left-0 pl-0 pr-[0.008px] py-0 rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] top-0 w-[167.312px]" data-name="Button">
      <Paragraph2 />
    </div>
  );
}

function CategorySelector() {
  return (
    <div className="h-[32px] relative shrink-0 w-full" data-name="CategorySelector">
      <Container2 />
      <Button />
      <Button1 />
      <Container3 />
      <Container4 />
      <Button2 />
    </div>
  );
}

function TaskDialog2() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] h-[58px] items-start relative shrink-0 w-full" data-name="TaskDialog">
      <Label1 />
      <CategorySelector />
    </div>
  );
}

function Label2() {
  return (
    <div className="h-[18px] relative shrink-0 w-full" data-name="Label">
      <p className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[18px] left-0 not-italic text-[#9f9fa9] text-[12px] text-nowrap top-px whitespace-pre">Priority</p>
    </div>
  );
}

function TaskDialog3() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[30.93px]" data-name="TaskDialog">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] overflow-clip relative rounded-[inherit] w-[30.93px]">
        <p className="absolute font-['Poppins:Regular',_sans-serif] leading-[19.5px] left-0 not-italic text-[#ff6467] text-[13px] text-nowrap top-[1.5px] whitespace-pre">High</p>
      </div>
    </div>
  );
}

function Icon() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon" opacity="0.5">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="var(--stroke-0, #A1A1A1)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function PrimitiveButton() {
  return (
    <div className="bg-[rgba(38,38,38,0.3)] h-[36px] relative rounded-[8px] shrink-0 w-full" data-name="Primitive.button">
      <div aria-hidden="true" className="absolute border border-solid border-zinc-700 inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex h-[36px] items-center justify-between px-[13px] py-px relative w-full">
          <TaskDialog3 />
          <Icon />
        </div>
      </div>
    </div>
  );
}

function Container5() {
  return (
    <div className="basis-0 grow h-[62px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[8px] h-[62px] items-start relative w-full">
        <Label2 />
        <PrimitiveButton />
      </div>
    </div>
  );
}

function Label3() {
  return (
    <div className="h-[18px] relative shrink-0 w-full" data-name="Label">
      <p className="absolute font-['Inter:Regular',_sans-serif] font-normal leading-[18px] left-0 not-italic text-[#9f9fa9] text-[12px] text-nowrap top-px whitespace-pre">Category</p>
    </div>
  );
}

function Text() {
  return (
    <div className="bg-[#2b7fff] relative rounded-[1.67772e+07px] shrink-0 size-[6px]" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border size-[6px]" />
    </div>
  );
}

function Text1() {
  return (
    <div className="basis-0 grow h-[19.5px] min-h-px min-w-px relative shrink-0" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[19.5px] relative w-full">
        <p className="absolute font-['Poppins:Regular',_sans-serif] leading-[19.5px] left-0 not-italic text-[13px] text-nowrap text-zinc-300 top-[1.5px] whitespace-pre">Work</p>
      </div>
    </div>
  );
}

function TaskDialog4() {
  return (
    <div className="h-[19.5px] relative shrink-0 w-[47.563px]" data-name="TaskDialog">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex gap-[6px] h-[19.5px] items-center relative w-[47.563px]">
        <Text />
        <Text1 />
      </div>
    </div>
  );
}

function Icon1() {
  return (
    <div className="relative shrink-0 size-[16px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16 16">
        <g id="Icon" opacity="0.5">
          <path d="M4 6L8 10L12 6" id="Vector" stroke="var(--stroke-0, #D4D4D8)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33333" />
        </g>
      </svg>
    </div>
  );
}

function SlotClone() {
  return (
    <div className="bg-[rgba(38,38,38,0.3)] h-[36px] relative rounded-[8px] shrink-0 w-full" data-name="SlotClone">
      <div aria-hidden="true" className="absolute border border-solid border-zinc-700 inset-0 pointer-events-none rounded-[8px]" />
      <div className="flex flex-row items-center size-full">
        <div className="box-border content-stretch flex h-[36px] items-center justify-between px-[13px] py-px relative w-full">
          <TaskDialog4 />
          <Icon1 />
        </div>
      </div>
    </div>
  );
}

function Container6() {
  return (
    <div className="basis-0 grow h-[62px] min-h-px min-w-px relative shrink-0" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border content-stretch flex flex-col gap-[8px] h-[62px] items-start relative w-full">
        <Label3 />
        <SlotClone />
      </div>
    </div>
  );
}

function TaskDialog5() {
  return (
    <div className="content-stretch flex gap-[12px] h-[62px] items-start relative shrink-0 w-full" data-name="TaskDialog">
      <Container5 />
      <Container6 />
    </div>
  );
}

function Frame1() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[24px] items-start left-[24px] top-[76px] w-[502px]">
      <TaskDialog1 />
      <TaskDialog2 />
      <TaskDialog5 />
    </div>
  );
}

function Icon2() {
  return (
    <div className="absolute left-[17.5px] size-[14px] top-[9px]" data-name="Icon">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p1e33adf8} id="Vector" stroke="var(--stroke-0, #FF6467)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Button3() {
  return (
    <div className="h-[32px] relative rounded-[8px] shrink-0 w-[99.594px]" data-name="Button">
      <div aria-hidden="true" className="absolute border border-[#ff6467] border-solid inset-0 pointer-events-none rounded-[8px]" />
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[32px] relative w-[99.594px]">
        <Icon2 />
        <p className="absolute font-['Poppins:Regular',_sans-serif] leading-[19.5px] left-[39.5px] not-italic text-[#ff6467] text-[13px] text-nowrap top-[7.75px] whitespace-pre">Delete</p>
      </div>
    </div>
  );
}

function Button4() {
  return (
    <div className="bg-[#0084d1] h-[32px] relative rounded-[8px] shrink-0 w-[88.938px]" data-name="Button">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid box-border h-[32px] relative w-[88.938px]">
        <p className="absolute font-['Poppins:Regular',_sans-serif] leading-[19.5px] left-[20px] not-italic text-[13px] text-nowrap text-white top-[7.75px] whitespace-pre">Update</p>
      </div>
    </div>
  );
}

function TaskDialog6() {
  return (
    <div className="absolute bottom-[24px] box-border content-stretch flex gap-[8px] h-[49px] items-start justify-end left-[24px] pb-0 pt-[17px] px-0 w-[502px]" data-name="TaskDialog">
      <div aria-hidden="true" className="absolute border-[1px_0px_0px] border-solid border-zinc-800 inset-0 pointer-events-none" />
      <Button3 />
      <Button4 />
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents inset-1/4" data-name="Group">
      <div className="absolute inset-1/4" data-name="Vector">
        <div className="absolute inset-[-6.25%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12 12">
            <path d={svgPaths.p23458280} id="Vector" stroke="var(--stroke-0, #9F9FA9)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Icon3() {
  return (
    <div className="h-[20px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <Group />
    </div>
  );
}

function TaskDialog7() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[514px] size-[20px] top-[20px]" data-name="TaskDialog">
      <Icon3 />
    </div>
  );
}

export default function Container7() {
  return (
    <div className="bg-zinc-900 relative rounded-[12px] size-full" data-name="Container">
      <div aria-hidden="true" className="absolute border border-solid border-zinc-800 inset-0 pointer-events-none rounded-[12px] shadow-[0px_25px_50px_-12px_rgba(0,0,0,0.25)]" />
      <TaskDialog />
      <Frame1 />
      <TaskDialog6 />
      <TaskDialog7 />
    </div>
  );
}