
import { NavLink } from 'react-router-dom';
import { Clock, BarChart } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface MaterialCardProps {
  id: string;
  title: string;
  description: string;
  image: string;
  categories: string[];
  duration: string;
  progress: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const MaterialCard = ({
  id,
  title,
  description,
  image,
  categories,
  duration,
  progress,
  difficulty
}: MaterialCardProps) => {
  const difficultyColor = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-blue-100 text-blue-800',
    advanced: 'bg-purple-100 text-purple-800'
  };
  
  const difficultyText = {
    beginner: '初級',
    intermediate: '中級',
    advanced: '上級'
  };

  return (
    <NavLink
      to={`/materials/${id}`}
      className="block glass rounded-xl overflow-hidden shadow-subtle card-hover"
    >
      <div className="aspect-video w-full overflow-hidden">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
      </div>
      
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.slice(0, 2).map((category, index) => (
            <Badge key={index} variant="secondary" className="font-normal text-xs sm:text-sm">
              {category}
            </Badge>
          ))}
          {categories.length > 2 && (
            <Badge variant="outline" className="font-normal text-xs sm:text-sm">
              +{categories.length - 2}
            </Badge>
          )}
          <Badge 
            className={`font-normal ml-auto text-xs sm:text-sm ${difficultyColor[difficulty as keyof typeof difficultyColor]}`}
          >
            {difficultyText[difficulty as keyof typeof difficultyText]}
          </Badge>
        </div>
        
        <h3 className="text-lg sm:text-xl font-semibold mb-2 line-clamp-1">{title}</h3>
        <p className="text-muted-foreground text-xs sm:text-sm mb-4 line-clamp-2">
          {description}
        </p>
        
        <div className="flex items-center text-xs sm:text-sm text-muted-foreground mb-3">
          <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
          <span>{duration}</span>
          <BarChart className="w-3 h-3 sm:w-4 sm:h-4 ml-3 sm:ml-4 mr-1" />
          <span>{progress}% 完了</span>
        </div>
        
        <Progress value={progress} className="h-1" />
      </div>
    </NavLink>
  );
};

export default MaterialCard;
