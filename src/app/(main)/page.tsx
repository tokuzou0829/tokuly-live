import "./tokuly-livestyle.css";
import TopLive from "./toplive";
import Link from "next/link";
import Live from "@/components/ui/live";
import { getOnlineLiveList } from "@/requests/live";

export const revalidate = 0;

export default async function Home() {
  const lives = await getOnlineLiveList();

  return (
    <div>
      {lives.lives.length === 0 ? (
        <>
          <p
            style={{
              fontSize: 20,
              textAlign: "center",
              marginTop: 20,
              marginBottom: 5,
            }}
          >
            まだ配信は行われていないようです
          </p>
          <Link
            style={{
              display: "block",
              fontSize: 20,
              textAlign: "center",
              marginTop: 0,
              textDecoration: "underline",
            }}
            href="https://tokuly.com/studio"
            target="_blank"
          >
            配信を始める！
          </Link>
        </>
      ) : (
        <>
          <TopLive lives={lives.lives}></TopLive>
          <p className=" text-[20px] m-[10px] font-bold">オンラインの配信</p>
          <div className="flex flex-wrap sm-center">
            {lives.lives.map((live, index) => (
              <Live key={index} live={live}></Live>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
