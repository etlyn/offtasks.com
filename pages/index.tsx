import { Layout } from "../components";
import Image from "next/image";

export default function Home() {
  return (
    <Layout title="home">
      <div className="flex flex-1 justify-center">
        <h1 className="text-white ">Welcome</h1>

        <Image
          src="/assets/image1.png"
          width={390}
          height={507}
          alt="1"
          quality={30}
        />
      </div>
    </Layout>
  );
}
