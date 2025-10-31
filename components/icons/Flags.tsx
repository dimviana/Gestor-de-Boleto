import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

export const BrazilFlagIcon: React.FC<IconProps> = (props) => (
  <svg {...props} viewBox="0 0 1000 700" xmlns="http://www.w3.org/2000/svg">
    <rect width="1000" height="700" fill="#009c3b" />
    <path d="M500 57.5L829.5 350 500 642.5 170.5 350z" fill="#ffdf00" />
    <circle cx="500" cy="350" r="175" fill="#002776" />
  </svg>
);

export const UsaFlagIcon: React.FC<IconProps> = (props) => (
  <svg {...props} viewBox="0 0 1235 650" xmlns="http://www.w3.org/2000/svg">
    <path fill="#b22234" d="M0 0h1235v650H0z" />
    <path fill="#fff" d="M0 50h1235v50H0zm0 100h1235v50H0zm0 100h1235v50H0zm0 100h1235v50H0zm0 100h1235v50H0zm0 100h1235v50H0z" />
    <path fill="#3c3b6e" d="M0 0h494v350H0z" />
    <g fill="#fff">
      {[...Array(5)].map((_, i) =>
        [...Array(6)].map((_, j) => (
          <path key={`${i}-${j}`} d={`M${41.16+j*82.33} ${35+i*70}l12.7 38.8-33.2-24h41l-33.2 24z`} />
        ))
      )}
      {[...Array(4)].map((_, i) =>
        [...Array(5)].map((_, j) => (
          <path key={`2-${i}-${j}`} d={`M${82.33+j*82.33} ${70+i*70}l12.7 38.8-33.2-24h41l-33.2 24z`} />
        ))
      )}
    </g>
  </svg>
);
