import Video from "./videoframe";
import Viewer from "./viewer";
import Chat from "./chat";
import { auth } from "../../../api/auth/[...nextauth]/route";
import LiveOverview from "./liveOverview";
import { getLive } from "@/requests/live";

interface LiveProps {
  id: string;
}

export const revalidate = 180;

export default async function LivePlayer({ id }: LiveProps) {
  const [session, live] = await Promise.all([auth(), getLive({ id })]);

  return (
    <div className="w-[100%] p-5 overflow-hidden">
      <div className="xl:flex">
        <Video live={live} />
        <Chat id={live.id} session={session}></Chat>
      </div>
      <p className="mt-0 text-3xl font-bold">{live.title}</p>
      <div className="flex w-[100%]">
        <div className="relative w-[85px] h-[85px]">
          <img
            src={live.ch_icon}
            className="w-[80px] h-[80px] rounded-full aspect-square m-[auto] object-cover flex-shrink-0 min-w-[80px] m-[2.5px] mt-[0px]"
          />
          <div className="absolute bg-red-600 w-[85px] h-[25px] bottom-[0px] left-[0px] rounded-md">
            <p className=" text-white text-center font-semibold">ライブ配信</p>
          </div>
        </div>
        <div>
          <p className="font-bold mb-0 text-xl">{live.ch_name}</p>
          <Viewer id={id} />
        </div>
      </div>
      <LiveOverview live={live} />
    </div>
  );
}
