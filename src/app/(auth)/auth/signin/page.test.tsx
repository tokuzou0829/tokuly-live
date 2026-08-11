import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SignInPage from "./page";

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));

vi.mock("next-auth/react", () => ({ signIn }));

describe("sign-in page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signIn.mockResolvedValue(undefined);
  });

  afterEach(cleanup);

  it("shows the Tokuly OAuth sign-in interface", () => {
    render(<SignInPage />);

    expect(screen.getByRole("img", { name: "Tokuly" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tokuly Liveにログイン" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tokulyでログイン" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ホームに戻る" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText(/新規登録/)).not.toBeInTheDocument();
  });

  it("passes the requested callback URL to Tokuly OAuth", () => {
    render(<SignInPage searchParams={{ callbackUrl: "/studio" }} />);

    fireEvent.click(screen.getByRole("button", { name: "Tokulyでログイン" }));

    expect(signIn).toHaveBeenCalledWith("tokuly", { callbackUrl: "/studio" });
  });

  it("falls back to the home page when no callback URL is provided", () => {
    render(<SignInPage />);

    fireEvent.click(screen.getByRole("button", { name: "Tokulyでログイン" }));

    expect(signIn).toHaveBeenCalledWith("tokuly", { callbackUrl: "/" });
  });

  it("disables repeat submissions while OAuth is starting", async () => {
    signIn.mockReturnValue(new Promise(() => undefined));
    render(<SignInPage />);

    const button = screen.getByRole("button", { name: "Tokulyでログイン" });
    fireEvent.click(button);
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "移動しています…" })).toBeDisabled();
    });
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it("shows a retry message when Auth.js reports an error", () => {
    render(<SignInPage searchParams={{ error: "OAuthSignin" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "ログインを完了できませんでした。もう一度お試しください。"
    );
  });
});
