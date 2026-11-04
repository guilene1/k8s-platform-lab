import { Link } from 'react-router';

export default function Landing() {
  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="kicker">Personal banking · Since 1987</p>
          <h1 className="hero__title">Money,<br /><em>in plain sight.</em></h1>
          <p className="hero__lede">
            Checking without fees, savings at 4.10% APY and transfers that land in seconds.
            Every number on one calm screen.
          </p>
          <div className="hero__ctas">
            <Link to="/app" className="btn btn--ghost">Open your dashboard</Link>
            <Link to="/app/transfer" className="btn btn--text">Move money →</Link>
          </div>
        </div>
        <dl className="hero__stats">
          <div><dt>Savings APY</dt><dd>4.10%</dd></div>
          <div><dt>Monthly fees</dt><dd>$0</dd></div>
          <div><dt>Transfers</dt><dd>Instant</dd></div>
        </dl>
      </section>

      <section className="band">
        <div className="band__img" style={{ backgroundImage: 'url(/images/glass.jpg)' }} />
        <div className="band__copy">
          <p className="kicker kicker--dark">Security</p>
          <h2 className="display">Built like the building<br /><em>it lives in.</em></h2>
          <p>Every transfer is checked twice and recorded once. Balances are locked while money moves, so two payments can never spend the same dollar.</p>
          <Link to="/app" className="link">See your accounts →</Link>
        </div>
      </section>

      <section className="band band--flip">
        <div className="band__img" style={{ backgroundImage: 'url(/images/towers.jpg)' }} />
        <div className="band__copy">
          <p className="kicker kicker--dark">Savings</p>
          <h2 className="display">Let it grow<br /><em>while you sleep.</em></h2>
          <p>High-Yield Savings pays 4.10% APY, compounded daily and credited monthly. Sweep in from checking whenever you like — no minimums, no lockups.</p>
          <Link to="/app/transfer" className="link">Start a transfer →</Link>
        </div>
      </section>
    </>
  );
}
