import {
  ArrowRight,
  CalendarHeart,
  Camera,
  Image as ImageIcon,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { formatDate, sortAnniversaries, todayKey } from "../lib/dates";
import type { AppSection, WorkspaceData } from "../types";

export function HomeSection({
  data,
  onNavigate,
  onOpenPhoto,
}: {
  data: WorkspaceData;
  onNavigate: (section: AppSection) => void;
  onOpenPhoto: (photoId: string) => void;
}) {
  const next = sortAnniversaries(data.anniversaries)[0];
  const latestEvent = data.events[0];
  const latestPhoto = data.photos[0];
  const nextDate = next?.nextDate;
  const today = todayKey();

  return (
    <section className="section-view home-view">
      <header className="home-heading">
        <div>
          <p className="eyebrow">欢迎回来</p>
          <h1>把今天，写进我们的时间里。</h1>
          <p>{data.space.name} · {new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date())}</p>
        </div>
        <div className="member-bubbles" aria-label="空间成员">
          {data.members.map((member, index) => (
            <span key={member.user_id} title={member.display_name} style={{ "--bubble-index": index } as React.CSSProperties}>
              {member.display_name.slice(0, 1)}
            </span>
          ))}
        </div>
      </header>

      <div className="dashboard-grid">
        <article className="countdown-card">
          <div className="countdown-card__top">
            <span className="soft-icon">
              <CalendarHeart size={19} />
            </span>
            <span>下一次纪念日</span>
          </div>
          {next ? (
            <>
              <div className="countdown-card__number">
                <strong>{next.days}</strong>
                <span>{next.days === 0 ? "就是今天" : "天后"}</span>
              </div>
              <h2>{next.anniversary.title}</h2>
              <p>
                {nextDate === today ? "愿今天被好好记住。" : `${formatDate(nextDate)} · ${next.label}`}
              </p>
              <button className="text-button text-button--light" type="button" onClick={() => onNavigate("anniversaries")}>
                查看全部纪念日 <ArrowRight size={15} />
              </button>
            </>
          ) : (
            <>
              <h2>还没有需要倒数的日子</h2>
              <p>把第一次见面、在一起的那天，或者任何一个重要日期放进来。</p>
              <button className="button button--light" type="button" onClick={() => onNavigate("anniversaries")}>
                添加纪念日
              </button>
            </>
          )}
          <Sparkles className="countdown-sparkle" size={50} aria-hidden="true" />
        </article>

        <article className="dashboard-card recent-event-card">
          <div className="dashboard-card__heading">
            <div>
              <p className="eyebrow">最近记录</p>
              <h2>时光轴上的一页</h2>
            </div>
            <span className="soft-icon soft-icon--sage">
              <CalendarHeart size={18} />
            </span>
          </div>
          {latestEvent ? (
            <button className="recent-event" type="button" onClick={() => onNavigate("timeline")}>
              <time>{formatDate(latestEvent.event_date)}</time>
              <strong>{latestEvent.title}</strong>
              <span>{latestEvent.description || "打开这段回忆"}</span>
            </button>
          ) : (
            <button className="empty-mini" type="button" onClick={() => onNavigate("timeline")}>
              写下第一件想记住的事 <ArrowRight size={16} />
            </button>
          )}
        </article>

        <article className="dashboard-card recent-photo-card">
          <div className="dashboard-card__heading">
            <div>
              <p className="eyebrow">相册</p>
              <h2>刚刚放进来的光</h2>
            </div>
            <span className="soft-icon soft-icon--rose">
              <Camera size={18} />
            </span>
          </div>
          {latestPhoto ? (
            <button className="recent-photo" type="button" onClick={() => onOpenPhoto(latestPhoto.id)}>
              {latestPhoto.signedUrl ? <img src={latestPhoto.signedUrl} alt="" /> : null}
              <span>
                <strong>{latestPhoto.shot_at ? formatDate(latestPhoto.shot_at) : "最近上传"}</strong>
                <small>打开照片与留言</small>
              </span>
            </button>
          ) : (
            <button className="empty-mini" type="button" onClick={() => onNavigate("gallery")}>
              上传第一张照片 <ArrowRight size={16} />
            </button>
          )}
        </article>

        <article className="dashboard-card stats-card">
          <div className="dashboard-card__heading">
            <div>
              <p className="eyebrow">一起留下</p>
              <h2>现在的记录</h2>
            </div>
            <span className="soft-icon">
              <ImageIcon size={18} />
            </span>
          </div>
          <div className="stats-row">
            <button type="button" onClick={() => onNavigate("anniversaries")}>
              <strong>{data.anniversaries.length}</strong>
              <span>纪念日</span>
            </button>
            <button type="button" onClick={() => onNavigate("timeline")}>
              <strong>{data.events.length}</strong>
              <span>时光记录</span>
            </button>
            <button type="button" onClick={() => onNavigate("gallery")}>
              <strong>{data.photos.length}</strong>
              <span>照片</span>
            </button>
            <button type="button" onClick={() => onNavigate("gallery")}>
              <strong>{data.comments.length}</strong>
              <span>
                <MessageCircle size={12} /> 留言
              </span>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}
