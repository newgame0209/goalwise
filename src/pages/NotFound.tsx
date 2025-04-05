
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-6xl font-bold mb-4 text-gray-800">404</h1>
        <p className="text-xl text-gray-600 mb-6">申し訳ありません。お探しのページが見つかりませんでした</p>
        <p className="text-sm text-gray-500 mb-6">リクエストされたパス: {location.pathname}</p>
        <Button asChild>
          <Link to="/" className="inline-block">
            ホームに戻る
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
