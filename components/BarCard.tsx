interface BarCardProps {
  name: string;
  neighborhood: string;
  barType: string;
  peopleGoing: number;
}

export default function BarCard({ name, neighborhood, barType, peopleGoing }: BarCardProps) {
  return (
    <div className="border border-gray-300 rounded p-4">
      <h3 className="font-bold text-lg">{name}</h3>
      <p className="text-sm text-gray-600">{neighborhood}</p>
      <p className="text-sm text-gray-500 mt-1">{barType}</p>
      <p className="text-sm font-medium mt-2">{peopleGoing} people going</p>
    </div>
  );
}