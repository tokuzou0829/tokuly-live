import Video from "./videoframe";
import Viewer from "./viewer";
import Chat from "./chat";
import { auth } from "@/auth";
import LiveOverview from "./liveOverview";
import { getLive } from "@/requests/live";
import { MoreVideo } from "@/components/moreVideo";

interface LiveProps {
  id: string;
}

export const revalidate = 180;

export default async function LivePlayer({ id }: LiveProps) {
  const [session, live] = await Promise.all([auth(), getLive({ id })]);

  return (
    <div className="w-[100%] overflow-hidden">
      <div className="xl:flex">
        <div className="w-full">
          <Video live={live} />
            <div className="px-2">
              <p className="mt-0 text-2xl font-bold">{live.title}</p>
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
        </div>
        <div className="p-[10px] xl:min-w-[430px] max-w-[100%] xl:max-w-[430px] xl:pr-[20px]">
          <div>
            {live.status !== "video" && (
              <>
                <Chat id={live.id} session={session}></Chat>
                <div className="mb-2" />
              </>
            )}
            <MoreVideo stream={live}></MoreVideo>
          </div>
        </div>
      </div>
    </div>
  );
}
