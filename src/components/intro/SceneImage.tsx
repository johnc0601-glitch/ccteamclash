import Image from 'next/image';
import type {CSSProperties} from 'react';
import styles from './Intro.module.css';

type SceneImageProps = {
  alt: string;
  className: string;
  durationMs: number;
  preload?: boolean;
  src: string;
};

type SceneStyle = CSSProperties & {
  '--scene-duration': string;
};

export function SceneImage({
  alt,
  className,
  durationMs,
  preload = false,
  src,
}: SceneImageProps) {
  const style: SceneStyle = {'--scene-duration': `${durationMs}ms`};

  return (
    <div className={`${styles.sceneImage} ${className}`} style={style} aria-hidden="true">
      <Image
        alt={alt}
        fill
        preload={preload}
        sizes="100vw"
        src={src}
        className={styles.image}
      />
    </div>
  );
}
