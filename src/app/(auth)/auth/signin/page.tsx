"use client";

import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> {}

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [formValues, setFormValues] = useState({
    email: "",
    password: "",
  });
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormValues({ ...formValues, [name]: value });
  };
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  async function onSubmit(event: React.SyntheticEvent) {
    event.preventDefault();
    setIsLoading(true);

    const res = await signIn("credentials", {
      redirect:false,
      email: formValues.email,
      password: formValues.password,
      callbackUrl,
    });

    setIsLoading(false);

    console.log(res);
    if (!res?.error) {
      router.push(callbackUrl) 
    } else {
      console.log("メールアドレスか、パスワードが間違っています");
    }
  }

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit} >
        <div className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input id="email" type="email" name="email" placeholder="tokulylove@example.com" onInput={handleChange}/>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              placeholder="パスワード"
              id="password"
              type="password"
              name="password"
              onInput={handleChange}
            />
          </div>
          <Button disabled={isLoading}>ログイン</Button>
        </div>
      </form>
    </div>
  );
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <div className="w-full mx-auto flex justify-center">
            <img
              src="/tokuly.png"
              className="h-[40px] w-[40px] rounded mx-auto"
            />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            おかえりなさい！
          </h1>
          <p className="text-sm text-muted-foreground">
            いつものTokulyアカウントでログインできます。
          </p>
        </div>
        <UserAuthForm />
        <p className="px-8 text-center text-sm text-muted-foreground">
          Tokulyアカウントをお持ちでありませんか？
          <Link
            href="/terms"
            className="underline underline-offset-4 hover:text-primary"
          >
            こちら
          </Link>
          から作成できます。
        </p>
      </div>
    </div>
  );
}
