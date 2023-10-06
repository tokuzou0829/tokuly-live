'use client';
import React, { useState, useEffect } from 'react';
type CountPrpps ={
    id:string;
}
function FetchDataComponent(props:CountPrpps) {
  const {id} = props;
  const [data, setData] = useState(''); // データの初期値は空文字列
  const apiUrl = 'https://live.tokuly.com/nclients?app=live&name='+id;

  // データをフェッチする関数
  const fetchData = async () => {
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
      }
      const body = await response.text();
      setData(body); // データをセットする
    } catch (error) {
      console.error(error);
    }
  };

  // コンポーネントがマウントされたときと3秒ごとにデータをフェッチ
  useEffect(() => {
    fetchData(); // マウント時にもフェッチする
    const intervalId = setInterval(fetchData, 3000);

    // コンポーネントがアンマウントされたときにクリーンアップ
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div>
      <p>視聴者数 : {data}</p>
    </div>
  );
}

export default FetchDataComponent;
