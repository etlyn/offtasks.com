import svgPaths from "@/imports/svg-gcwartiq9w";

interface LogoWordmarkProps {
  width?: number;
  height?: number;
}

export const LogoWordmark = ({ width = 160, height = 40 }: LogoWordmarkProps) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 162 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="scale(1.25 1.25) translate(0 -1)">
      <path d={svgPaths.p9c53700} fill="#99F6E4" />
      <path d={svgPaths.p79ae300} fill="#134E4A" />
      <g>
        <rect fill="#FAFAFA" height="24.0802" rx="5.07009" width="24.814" x="3.58887" y="3.08118" />
        <path clipRule="evenodd" d={svgPaths.p32a3f280} fill="#134E4A" fillRule="evenodd" />
      </g>
    </g>
    <text
      x="50"
      y="26"
      fill="#134E4A"
      fontFamily="'Poppins', sans-serif"
      fontSize="18"
      fontWeight="600"
    >
      Offtasks
    </text>
  </svg>
);
