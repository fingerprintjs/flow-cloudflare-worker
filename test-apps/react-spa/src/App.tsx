function App() {
  return (
    <>
      <h1>Latest Flight Offers</h1>
      <div className='tickets'>
        <article className='ticket'>
          <div className='tag'>Non‑stop</div>
          <div className='airline'>
            <div className='logo'>SK</div>
            <div>
              <div className='airline-name'>SkyLine Air</div>
              <div className='flight'>SK 371 • Economy</div>
            </div>
          </div>

          <div className='route'>
            <div>
              <div className='city'>IST</div>
              <div className='flight'>Istanbul</div>
            </div>
            <div className='arrow'>→</div>
            <div>
              <div className='city'>LON</div>
              <div className='flight'>London</div>
            </div>
          </div>

          <div className='meta'>
            <div>Depart: 2026-01-10 08:30</div>
            <div>Arrive: 2026-01-10 10:45</div>
            <div>Duration: 4h 15m</div>
          </div>

          <div className='price-row'>
            <div className='fees'>Base fare + taxes</div>
            <div className='price'>€249</div>
          </div>

          <div className='fees-breakdown'>
            <div className='fee-item'>
              <span>Base fare</span>
              <strong>€199</strong>
            </div>
            <div className='fee-item'>
              <span>Taxes &amp; fees</span>
              <strong>€30</strong>
            </div>
            <div className='fee-item'>
              <span>Service</span>
              <strong>€20</strong>
            </div>
          </div>
        </article>

        <article className='ticket'>
          <div className='tag'>1 stop</div>
          <div className='airline'>
            <div className='logo'>AR</div>
            <div>
              <div className='airline-name'>AeroRoute</div>
              <div className='flight'>AR 904 • Premium Economy</div>
            </div>
          </div>

          <div className='route'>
            <div>
              <div className='city'>IST</div>
              <div className='flight'>Istanbul</div>
            </div>
            <div className='arrow'>→</div>
            <div>
              <div className='city'>NYC</div>
              <div className='flight'>New York</div>
            </div>
          </div>

          <div className='meta'>
            <div>Depart: 2026-02-05 22:20</div>
            <div>Arrive: 2026-02-06 06:50</div>
            <div>Duration: 11h 30m (1 stop)</div>
          </div>

          <div className='price-row'>
            <div className='fees'>Includes hold baggage</div>
            <div className='price'>€599</div>
          </div>

          <div className='fees-breakdown'>
            <div className='fee-item'>
              <span>Base fare</span>
              <strong>€520</strong>
            </div>
            <div className='fee-item'>
              <span>Baggage</span>
              <strong>€30</strong>
            </div>
            <div className='fee-item'>
              <span>Taxes</span>
              <strong>€49</strong>
            </div>
          </div>
        </article>

        <article className='ticket'>
          <div className='tag'>Sale</div>
          <div className='airline'>
            <div className='logo'>FL</div>
            <div>
              <div className='airline-name'>FlyLuxe</div>
              <div className='flight'>FL 210 • Business</div>
            </div>
          </div>

          <div className='route'>
            <div>
              <div className='city'>IST</div>
              <div className='flight'>Istanbul</div>
            </div>
            <div className='arrow'>→</div>
            <div>
              <div className='city'>DXB</div>
              <div className='flight'>Dubai</div>
            </div>
          </div>

          <div className='meta'>
            <div>Depart: 2026-03-12 14:10</div>
            <div>Arrive: 2026-03-12 19:00</div>
            <div>Duration: 4h 50m</div>
          </div>

          <div className='price-row'>
            <div className='fees'>Fully refundable</div>
            <div className='price'>€1,099</div>
          </div>

          <div className='fees-breakdown'>
            <div className='fee-item'>
              <span>Base fare</span>
              <strong>€980</strong>
            </div>
            <div className='fee-item'>
              <span>Fuel surcharge</span>
              <strong>€70</strong>
            </div>
            <div className='fee-item'>
              <span>Tax</span>
              <strong>€49</strong>
            </div>
          </div>
        </article>
      </div>
    </>
  )
}

export default App
