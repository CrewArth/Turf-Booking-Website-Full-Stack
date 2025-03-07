import Hero from '@/components/Hero';
import Gallery from '@/components/Gallery';
import Map from '@/components/Map';
import Contact from '@/components/Contact';

export default function Home() {
  return (
    <>
      <Hero />
      <Gallery />
      <Contact />
      <Map 
        address="Turf 106, Cricket Academy, Sevasi - 
        Canal Rd, behind Vadodara, near Akshar Public
         School, Bhayli, Vadodara, Gujarat 391410"
        lat={22.30482906545118} // Replace with your actual latitude
        lng={73.12183216500833} // Replace with your actual longitude
      />
      {/* Other sections will be added here */}
    </>
  );
}
