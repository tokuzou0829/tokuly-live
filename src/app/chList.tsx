import React from 'react';

interface ChProps {
  icon_url: string;
  name: string;
  handle: string;
}

function Ch(props: ChProps) {
  const { icon_url, name, handle } = props;

  return (
    <div className="users">
      <a href={"/"+handle} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
        <img src={icon_url} className="usersimg" alt="User" />
        <div>
          <p className="sidebar-text-user">{name}</p>
          <p className="sidebar-text-game">VALORANT</p>
        </div>
      </a>
    </div>
  );
}

export default Ch;
